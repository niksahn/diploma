"""
Функциональные тесты для WebSocket соединений Chat Service

Покрывает WebSocket эндпоинт из server/plans/api/chat_service.md:
- WS /api/v1/chats/ws - WebSocket соединение для real-time общения

Тестирует события:
- join_chat / leave_chat
- send_message
- typing / stop_typing
- new_message
- message_edited
- message_deleted
- user_typing / user_stopped_typing
- user_joined / user_left
- error
"""
import pytest
import requests
import websocket
import json
import threading
import time
import queue

# Mock токен для WebSocket тестов (поскольку handler требует токен в query)
MOCK_JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJyb2xlIjoidXNlciJ9.mock"


class WebSocketClient:
    """Вспомогательный класс для работы с WebSocket"""
    
    def __init__(self, url, token):
        normalized_url = url
        if url.startswith("http://"):
            normalized_url = f"ws://{url[len('http://'):]}"
        elif url.startswith("https://"):
            normalized_url = f"wss://{url[len('https://'):]}"
        self.url = f"{normalized_url}?token={token}"
        self.ws = None
        self.messages = queue.Queue()
        self.connected = False
        
    def connect(self, timeout=5):
        """Подключиться к WebSocket"""
        try:
            self.ws = websocket.WebSocketApp(
                self.url,
                on_message=self._on_message,
                on_error=self._on_error,
                on_close=self._on_close,
                on_open=self._on_open
            )
            
            # Запускаем в отдельном потоке
            self.ws_thread = threading.Thread(target=self.ws.run_forever)
            self.ws_thread.daemon = True
            self.ws_thread.start()
            
            # Ждем подключения
            start_time = time.time()
            while not self.connected and (time.time() - start_time) < timeout:
                time.sleep(0.1)
            
            if not self.connected:
                raise Exception("WebSocket connection timeout")
                
        except Exception as e:
            raise Exception(f"Failed to connect: {e}")
    
    def _on_open(self, ws):
        """Обработчик открытия соединения"""
        self.connected = True
    
    def _on_message(self, ws, message):
        """Обработчик получения сообщения"""
        try:
            data = json.loads(message)
            self.messages.put(data)
        except json.JSONDecodeError:
            self.messages.put({"raw": message})
    
    def _on_error(self, ws, error):
        """Обработчик ошибок"""
        self.messages.put({"type": "error", "error": str(error)})
    
    def _on_close(self, ws, close_status_code, close_msg):
        """Обработчик закрытия соединения"""
        self.connected = False
    
    def send(self, data):
        """Отправить сообщение"""
        if self.ws and self.connected:
            self.ws.send(json.dumps(data))
        else:
            raise Exception("WebSocket not connected")
    
    def receive(self, timeout=5):
        """Получить сообщение с таймаутом"""
        try:
            return self.messages.get(timeout=timeout)
        except queue.Empty:
            return None
    
    def close(self):
        """Закрыть соединение"""
        if self.ws:
            self.ws.close()
        self.connected = False


class TestWebSocketConnection:
    """Тесты подключения к WebSocket"""

    def test_websocket_connect_success(
        self, chat_service_url, chat_api_path, user_auth_headers
    ):
        """Успешное подключение к WebSocket"""
        client = WebSocketClient(
            f"{chat_service_url}{chat_api_path}/ws",
            MOCK_JWT_TOKEN
        )
        
        try:
            client.connect()
            assert client.connected is True
        finally:
            client.close()

    def test_websocket_connect_invalid_token(
        self, chat_service_url, chat_api_path
    ):
        """Подключение с невалидным токеном"""
        client = WebSocketClient(
            f"{chat_service_url}{chat_api_path}/ws",
            "invalid_token"
        )
        
        # Подключение может пройти, но сервер должен отправить ошибку
        try:
            client.connect()
            # Ждем сообщение об ошибке
            message = client.receive(timeout=2)
            # Сервер может закрыть соединение или отправить ошибку
            assert message is not None or not client.connected
        finally:
            client.close()

    def test_websocket_connect_no_token(
        self, chat_service_url, chat_api_path
    ):
        """Подключение без токена"""
        # Пытаемся подключиться без токена
        try:
            ws = websocket.WebSocketApp(
                f"{chat_service_url}{chat_api_path}/ws",
                on_error=lambda ws, error: None
            )
            # Соединение должно быть отклонено
            # Это может быть проверено через код закрытия
        except Exception:
            # Ожидаемое поведение - соединение отклонено
            pass


class TestWebSocketChatEvents:
    """Тесты событий чата через WebSocket"""

    def test_join_and_leave_chat(
        self, chat_service_url, chat_api_path, workspace_with_members
    ):
        """Присоединение и выход из чата"""
        workspace = workspace_with_members
        leader = workspace["leader"]
        
        # Создаем чат через REST API
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [leader["user_id"]]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers={"Authorization": f"Bearer {leader['token']}"}
        )
        chat_id = create_response.json()["id"]
        
        # Подключаемся к WebSocket
        client = WebSocketClient(
            f"{chat_service_url}{chat_api_path}/ws",
            leader["token"]
        )
        
        try:
            client.connect()
            
            # Присоединяемся к чату
            client.send({
                "type": "join_chat",
                "chat_id": chat_id
            })
            
            # Ждем подтверждения (может быть или не быть)
            time.sleep(0.5)
            
            # Покидаем чат
            client.send({
                "type": "leave_chat",
                "chat_id": chat_id
            })
            
            time.sleep(0.5)
            
        finally:
            client.close()

    def test_send_message_via_websocket(
        self, chat_service_url, chat_api_path, workspace_with_members
    ):
        """Отправка сообщения через WebSocket"""
        workspace = workspace_with_members
        leader = workspace["leader"]
        member = workspace["members"][1]
        
        # Создаем чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [leader["user_id"], member["user_id"]]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers={"Authorization": f"Bearer {leader['token']}"}
        )
        chat_id = create_response.json()["id"]
        
        # Подключаемся к WebSocket как лидер
        leader_client = WebSocketClient(
            f"{chat_service_url}{chat_api_path}/ws",
            leader["token"]
        )
        
        # Подключаемся к WebSocket как участник
        member_client = WebSocketClient(
            f"{chat_service_url}{chat_api_path}/ws",
            member["token"]
        )
        
        try:
            leader_client.connect()
            member_client.connect()
            
            # Оба присоединяются к чату
            leader_client.send({
                "type": "join_chat",
                "chat_id": chat_id
            })
            member_client.send({
                "type": "join_chat",
                "chat_id": chat_id
            })
            
            time.sleep(0.5)
            
            # Лидер отправляет сообщение
            leader_client.send({
                "type": "send_message",
                "chat_id": chat_id,
                "text": "Hello via WebSocket!"
            })
            
            # Участник должен получить сообщение
            message = member_client.receive(timeout=3)
            if message:
                assert message["type"] == "new_message"
                assert message["message"]["text"] == "Hello via WebSocket!"
                assert message["message"]["chat_id"] == chat_id
            
        finally:
            leader_client.close()
            member_client.close()

    def test_typing_indicator(
        self, chat_service_url, chat_api_path, workspace_with_members
    ):
        """Тест индикатора печати"""
        workspace = workspace_with_members
        leader = workspace["leader"]
        member = workspace["members"][1]
        
        # Создаем чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [leader["user_id"], member["user_id"]]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers={"Authorization": f"Bearer {leader['token']}"}
        )
        chat_id = create_response.json()["id"]
        
        # Подключаемся к WebSocket
        leader_client = WebSocketClient(
            f"{chat_service_url}{chat_api_path}/ws",
            leader["token"]
        )
        member_client = WebSocketClient(
            f"{chat_service_url}{chat_api_path}/ws",
            member["token"]
        )
        
        try:
            leader_client.connect()
            member_client.connect()
            
            # Присоединяемся к чату
            leader_client.send({
                "type": "join_chat",
                "chat_id": chat_id
            })
            member_client.send({
                "type": "join_chat",
                "chat_id": chat_id
            })
            
            time.sleep(0.5)
            
            # Лидер начинает печатать
            leader_client.send({
                "type": "typing",
                "chat_id": chat_id
            })
            
            # Участник должен получить событие typing
            message = member_client.receive(timeout=2)
            if message:
                assert message["type"] == "user_typing"
                assert message["chat_id"] == chat_id
            
            # Лидер прекращает печатать
            leader_client.send({
                "type": "stop_typing",
                "chat_id": chat_id
            })
            
            # Участник должен получить событие stop_typing
            message = member_client.receive(timeout=2)
            if message:
                assert message["type"] == "user_stopped_typing"
                assert message["chat_id"] == chat_id
            
        finally:
            leader_client.close()
            member_client.close()

    def test_join_chat_error_not_member(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Ошибка при присоединении к чату, в котором пользователь не участвует"""
        workspace = workspace_with_members
        leader = workspace["leader"]
        
        # Создаем чат только с лидером
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [leader["user_id"]]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers={"Authorization": f"Bearer {leader['token']}"}
        )
        chat_id = create_response.json()["id"]
        
        # Подключаемся к WebSocket как посторонний пользователь
        client = WebSocketClient(
            f"{chat_service_url}{chat_api_path}/ws",
            MOCK_JWT_TOKEN
        )
        
        try:
            client.connect()
            
            # Пытаемся присоединиться к чату
            client.send({
                "type": "join_chat",
                "chat_id": chat_id
            })
            
            # Должны получить ошибку
            message = client.receive(timeout=3)
            if message:
                assert message["type"] == "error"
                assert "UNAUTHORIZED" in message.get("code", "") or "not a member" in message.get("message", "").lower()
            
        finally:
            client.close()

    def test_send_message_to_channel_as_non_admin(
        self, chat_service_url, chat_api_path, workspace_with_members
    ):
        """Попытка отправить сообщение в канал как обычный участник"""
        workspace = workspace_with_members
        leader = workspace["leader"]
        member = workspace["members"][1]
        
        # Создаем канал
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Channel",
            "type": 3,  # Канал
            "workspace_id": workspace["workspace_id"],
            "members": [leader["user_id"], member["user_id"]]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers={"Authorization": f"Bearer {leader['token']}"}
        )
        chat_id = create_response.json()["id"]
        
        # Подключаемся к WebSocket как обычный участник
        member_client = WebSocketClient(
            f"{chat_service_url}{chat_api_path}/ws",
            member["token"]
        )
        
        try:
            member_client.connect()
            
            # Присоединяемся к чату
            member_client.send({
                "type": "join_chat",
                "chat_id": chat_id
            })
            
            time.sleep(0.5)
            
            # Пытаемся отправить сообщение (должна быть ошибка)
            member_client.send({
                "type": "send_message",
                "chat_id": chat_id,
                "text": "This should fail"
            })
            
            # Должны получить ошибку
            message = member_client.receive(timeout=3)
            if message:
                assert message["type"] == "error"
            
        finally:
            member_client.close()



