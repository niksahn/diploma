"""
Функциональные тесты для Chat Service

Покрывает все REST эндпоинты из server/plans/api/chat_service.md:
- POST /api/v1/chats - Создать чат
- GET /api/v1/chats - Список чатов
- GET /api/v1/chats/:id - Информация о чате
- PUT /api/v1/chats/:id - Обновить чат
- DELETE /api/v1/chats/:id - Удалить чат
- POST /api/v1/chats/:id/members - Добавить участников
- GET /api/v1/chats/:id/members - Список участников
- PUT /api/v1/chats/:id/members/:user_id - Изменить роль участника
- DELETE /api/v1/chats/:id/members/:user_id - Удалить участника
- GET /api/v1/chats/:id/messages - История сообщений
- POST /api/v1/chats/:id/messages - Отправить сообщение
- PUT /api/v1/chats/:chat_id/messages/:message_id - Редактировать сообщение
- DELETE /api/v1/chats/:chat_id/messages/:message_id - Удалить сообщение
- PUT /api/v1/chats/:id/messages/read - Отметить как прочитанное
"""
import pytest
import requests
import time

# Константы для тестов
TEST_USER_ID = 1


class TestChatCreation:
    """Тесты для POST /api/v1/chats"""

    def test_create_group_chat_success(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Успешное создание группового чата"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        
        url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Group Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [m["user_id"] for m in workspace["members"][:3]]
        }
        
        response = requests.post(
            url,
            json=chat_data,
            headers=user_auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == chat_data["name"]
        assert data["type"] == 2
        assert data["workspace_id"] == workspace["workspace_id"]
        assert "id" in data
        assert "created_at" in data
        assert data["members_count"] == 3

    def test_create_personal_chat_success(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Успешное создание личного чата"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        member = workspace["members"][1]
        
        url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "",  # Для личного чата имя не требуется
            "type": 1,
            "workspace_id": workspace["workspace_id"],
            "members": [TEST_USER_ID, member["user_id"]]
        }
        
        response = requests.post(
            url,
            json=chat_data,
            headers=user_auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["type"] == 1
        assert data["workspace_id"] == workspace["workspace_id"]
        assert data["members_count"] == 2

    def test_create_channel_success(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Успешное создание канала"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        
        url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Channel",
            "type": 3,
            "workspace_id": workspace["workspace_id"],
            "members": [m["user_id"] for m in workspace["members"]]
        }
        
        response = requests.post(
            url,
            json=chat_data,
            headers=user_auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["type"] == 3

    def test_create_chat_unauthorized(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Создание чата без токена"""
        workspace = workspace_with_members, user_auth_headers
        
        url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": []
        }
        
        response = requests.post(url, json=chat_data)
        assert response.status_code == 401

    def test_create_chat_invalid_workspace(
        self, chat_service_url, chat_api_path, user_token
    ):
        """Создание чата с несуществующим РП"""
        url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": 99999,
            "members": []
        }
        
        response = requests.post(
            url,
            json=chat_data,
            headers=user_auth_headers
        )
        
        assert response.status_code == 404

    def test_create_chat_invalid_name_too_short(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Создание группового чата с именем менее 3 символов"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        
        url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "ab",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": []
        }
        
        response = requests.post(
            url,
            json=chat_data,
            headers=user_auth_headers
        )
        
        assert response.status_code == 400

    def test_create_personal_chat_wrong_members_count(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Создание личного чата с неправильным количеством участников"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        
        url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "type": 1,
            "workspace_id": workspace["workspace_id"],
            "members": [TEST_USER_ID, workspace["members"][1]["user_id"], workspace["members"][2]["user_id"]]
        }
        
        response = requests.post(
            url,
            json=chat_data,
            headers=user_auth_headers
        )
        
        assert response.status_code == 400


class TestChatList:
    """Тесты для GET /api/v1/chats"""

    def test_get_chats_success(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Успешное получение списка чатов"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        
        # Создаем чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [m["user_id"] for m in workspace["members"][:2]]
        }
        requests.post(
            create_url,
            json=chat_data,
            headers=user_auth_headers
        )
        
        # Получаем список чатов
        url = f"{chat_service_url}{chat_api_path}"
        response = requests.get(
            url,
            headers=user_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "chats" in data
        assert "total" in data
        assert len(data["chats"]) > 0

    def test_get_chats_filter_by_workspace(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Получение чатов с фильтром по РП"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        
        # Создаем чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [m["user_id"] for m in workspace["members"][:2]]
        }
        requests.post(
            create_url,
            json=chat_data,
            headers=user_auth_headers
        )
        
        # Получаем чаты с фильтром
        url = f"{chat_service_url}{chat_api_path}"
        response = requests.get(
            url,
            params={"workspace_id": workspace["workspace_id"]},
            headers=user_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert all(chat["workspace_id"] == workspace["workspace_id"] for chat in data["chats"])

    def test_get_chats_filter_by_type(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Получение чатов с фильтром по типу"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        
        # Создаем групповой чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Group Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [m["user_id"] for m in workspace["members"][:2]]
        }
        requests.post(
            create_url,
            json=chat_data,
            headers=user_auth_headers
        )
        
        # Получаем только групповые чаты
        url = f"{chat_service_url}{chat_api_path}"
        response = requests.get(
            url,
            params={"type": 2},
            headers=user_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert all(chat["type"] == 2 for chat in data["chats"])

    def test_get_chats_unauthorized(self, chat_service_url, chat_api_path):
        """Получение списка чатов без токена"""
        url = f"{chat_service_url}{chat_api_path}"
        response = requests.get(url)
        
        assert response.status_code == 401


class TestChatInfo:
    """Тесты для GET /api/v1/chats/:id"""

    def test_get_chat_info_success(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Успешное получение информации о чате"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        
        # Создаем чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [m["user_id"] for m in workspace["members"][:2]]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers=user_auth_headers
        )
        chat_id = create_response.json()["id"]
        
        # Получаем информацию о чате
        url = f"{chat_service_url}{chat_api_path}/{chat_id}"
        response = requests.get(
            url,
            headers=user_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == chat_id
        assert data["name"] == chat_data["name"]
        assert data["type"] == 2
        assert "my_role" in data
        assert data["my_role"] == 2  # Создатель - администратор

    def test_get_chat_info_not_member(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers, user_token
    ):
        """Получение информации о чате, в котором пользователь не участвует"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        
        # Создаем чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [TEST_USER_ID]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers=user_auth_headers
        )
        chat_id = create_response.json()["id"]
        
        # Пытаемся получить информацию о чате другим пользователем
        url = f"{chat_service_url}{chat_api_path}/{chat_id}"
        response = requests.get(
            url,
            headers=user_auth_headers
        )
        
        assert response.status_code == 403

    def test_get_chat_info_not_found(
        self, chat_service_url, chat_api_path, user_token
    ):
        """Получение информации о несуществующем чате"""
        url = f"{chat_service_url}{chat_api_path}/99999"
        response = requests.get(
            url,
            headers=user_auth_headers
        )
        
        assert response.status_code == 404


class TestChatUpdate:
    """Тесты для PUT /api/v1/chats/:id"""

    def test_update_chat_success(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Успешное обновление чата"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        
        # Создаем чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Original Name",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [m["user_id"] for m in workspace["members"][:2]]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers=user_auth_headers
        )
        chat_id = create_response.json()["id"]
        
        # Обновляем чат
        url = f"{chat_service_url}{chat_api_path}/{chat_id}"
        update_data = {"name": "Updated Name"}
        response = requests.put(
            url,
            json=update_data,
            headers=user_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert "updated_at" in data

    def test_update_chat_forbidden(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Обновление чата обычным участником (не администратором)"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        member = workspace["members"][1]
        
        # Создаем чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [TEST_USER_ID, member["user_id"]]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers=user_auth_headers
        )
        chat_id = create_response.json()["id"]
        
        # Пытаемся обновить чат обычным участником
        url = f"{chat_service_url}{chat_api_path}/{chat_id}"
        update_data = {"name": "Hacked Name"}
        response = requests.put(
            url,
            json=update_data,
            headers={"Authorization": f"Bearer {member['token']}"}
        )
        
        assert response.status_code == 403


class TestChatDelete:
    """Тесты для DELETE /api/v1/chats/:id"""

    def test_delete_chat_success(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Успешное удаление чата"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        
        # Создаем чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [m["user_id"] for m in workspace["members"][:2]]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers=user_auth_headers
        )
        chat_id = create_response.json()["id"]
        
        # Удаляем чат
        url = f"{chat_service_url}{chat_api_path}/{chat_id}"
        response = requests.delete(
            url,
            headers=user_auth_headers
        )
        
        assert response.status_code == 204
        
        # Проверяем, что чат удален
        get_response = requests.get(
            url,
            headers=user_auth_headers
        )
        assert get_response.status_code == 404

    def test_delete_chat_forbidden(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Удаление чата обычным участником"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        member = workspace["members"][1]
        
        # Создаем чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [TEST_USER_ID, member["user_id"]]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers=user_auth_headers
        )
        chat_id = create_response.json()["id"]
        
        # Пытаемся удалить чат обычным участником
        url = f"{chat_service_url}{chat_api_path}/{chat_id}"
        response = requests.delete(
            url,
            headers={"Authorization": f"Bearer {member['token']}"}
        )
        
        assert response.status_code == 403


class TestChatMembers:
    """Тесты для управления участниками чата"""

    def test_add_members_success(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Успешное добавление участников"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        
        # Создаем чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [TEST_USER_ID]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers=user_auth_headers
        )
        chat_id = create_response.json()["id"]
        
        # Добавляем участников
        url = f"{chat_service_url}{chat_api_path}/{chat_id}/members"
        add_data = {
            "user_ids": [m["user_id"] for m in workspace["members"][1:3]],
            "role": 1
        }
        response = requests.post(
            url,
            json=add_data,
            headers=user_auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert "added" in data
        assert len(data["added"]) == 2

    def test_add_members_forbidden(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Добавление участников обычным участником"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        member = workspace["members"][1]
        
        # Создаем чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [TEST_USER_ID, member["user_id"]]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers=user_auth_headers
        )
        chat_id = create_response.json()["id"]
        
        # Пытаемся добавить участников обычным участником
        url = f"{chat_service_url}{chat_api_path}/{chat_id}/members"
        add_data = {
            "user_ids": [workspace["members"][2]["user_id"]],
            "role": 1
        }
        response = requests.post(
            url,
            json=add_data,
            headers={"Authorization": f"Bearer {member['token']}"}
        )
        
        assert response.status_code == 403

    def test_get_members_success(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Успешное получение списка участников"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        
        # Создаем чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [m["user_id"] for m in workspace["members"][:3]]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers=user_auth_headers
        )
        chat_id = create_response.json()["id"]
        
        # Получаем список участников
        url = f"{chat_service_url}{chat_api_path}/{chat_id}/members"
        response = requests.get(
            url,
            headers=user_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "members" in data
        assert "total" in data
        assert len(data["members"]) == 3
        assert data["members"][0]["role"] == 2  # Создатель - администратор

    def test_update_member_role_success(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Успешное изменение роли участника"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        member = workspace["members"][1]
        
        # Создаем чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [TEST_USER_ID, member["user_id"]]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers=user_auth_headers
        )
        chat_id = create_response.json()["id"]
        
        # Изменяем роль участника
        url = f"{chat_service_url}{chat_api_path}/{chat_id}/members/{member['user_id']}"
        update_data = {"role": 2}
        response = requests.put(
            url,
            json=update_data,
            headers=user_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == 2

    def test_remove_member_success(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Успешное удаление участника"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        member = workspace["members"][1]
        
        # Создаем чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [TEST_USER_ID, member["user_id"]]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers=user_auth_headers
        )
        chat_id = create_response.json()["id"]
        
        # Удаляем участника
        url = f"{chat_service_url}{chat_api_path}/{chat_id}/members/{member['user_id']}"
        response = requests.delete(
            url,
            headers=user_auth_headers
        )
        
        assert response.status_code == 204


class TestMessages:
    """Тесты для работы с сообщениями"""

    def test_send_message_success(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Успешная отправка сообщения"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        
        # Создаем чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [m["user_id"] for m in workspace["members"][:2]]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers=user_auth_headers
        )
        chat_id = create_response.json()["id"]
        
        # Отправляем сообщение
        url = f"{chat_service_url}{chat_api_path}/{chat_id}/messages"
        message_data = {"text": "Hello, world!"}
        response = requests.post(
            url,
            json=message_data,
            headers=user_auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["text"] == "Hello, world!"
        assert data["chat_id"] == chat_id
        assert data["user_id"] == TEST_USER_ID
        assert "id" in data
        assert "date" in data

    def test_get_messages_success(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Успешное получение истории сообщений"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        
        # Создаем чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [m["user_id"] for m in workspace["members"][:2]]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers=user_auth_headers
        )
        chat_id = create_response.json()["id"]
        
        # Отправляем несколько сообщений
        messages_url = f"{chat_service_url}{chat_api_path}/{chat_id}/messages"
        for i in range(3):
            requests.post(
                messages_url,
                json={"text": f"Message {i}"},
                headers=user_auth_headers
            )
        
        # Получаем историю
        response = requests.get(
            messages_url,
            headers=user_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "messages" in data
        assert "total" in data
        assert len(data["messages"]) >= 3

    def test_edit_message_success(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Успешное редактирование сообщения"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        
        # Создаем чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [m["user_id"] for m in workspace["members"][:2]]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers=user_auth_headers
        )
        chat_id = create_response.json()["id"]
        
        # Отправляем сообщение
        messages_url = f"{chat_service_url}{chat_api_path}/{chat_id}/messages"
        send_response = requests.post(
            messages_url,
            json={"text": "Original text"},
            headers=user_auth_headers
        )
        message_id = send_response.json()["id"]
        
        # Редактируем сообщение
        edit_url = f"{chat_service_url}{chat_api_path}/{chat_id}/messages/{message_id}"
        edit_data = {"text": "Edited text"}
        response = requests.put(
            edit_url,
            json=edit_data,
            headers=user_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["text"] == "Edited text"
        assert data["edited"] is True

    def test_delete_message_success(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Успешное удаление сообщения"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        
        # Создаем чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [m["user_id"] for m in workspace["members"][:2]]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers=user_auth_headers
        )
        chat_id = create_response.json()["id"]
        
        # Отправляем сообщение
        messages_url = f"{chat_service_url}{chat_api_path}/{chat_id}/messages"
        send_response = requests.post(
            messages_url,
            json={"text": "Message to delete"},
            headers=user_auth_headers
        )
        message_id = send_response.json()["id"]
        
        # Удаляем сообщение
        delete_url = f"{chat_service_url}{chat_api_path}/{chat_id}/messages/{message_id}"
        response = requests.delete(
            delete_url,
            headers=user_auth_headers
        )
        
        assert response.status_code == 204

    def test_mark_messages_read_success(
        self, chat_service_url, chat_api_path, workspace_with_members, user_auth_headers
    ):
        """Успешная отметка сообщений как прочитанных"""
        workspace = workspace_with_members, user_auth_headers
        leader = workspace["leader"]
        
        # Создаем чат
        create_url = f"{chat_service_url}{chat_api_path}"
        chat_data = {
            "name": "Test Chat",
            "type": 2,
            "workspace_id": workspace["workspace_id"],
            "members": [m["user_id"] for m in workspace["members"][:2]]
        }
        create_response = requests.post(
            create_url,
            json=chat_data,
            headers=user_auth_headers
        )
        chat_id = create_response.json()["id"]
        
        # Отправляем сообщение
        messages_url = f"{chat_service_url}{chat_api_path}/{chat_id}/messages"
        send_response = requests.post(
            messages_url,
            json={"text": "Test message"},
            headers=user_auth_headers
        )
        message_id = send_response.json()["id"]
        
        # Отмечаем как прочитанное
        read_url = f"{chat_service_url}{chat_api_path}/{chat_id}/messages/read"
        read_data = {"last_message_id": message_id}
        response = requests.put(
            read_url,
            json=read_data,
            headers=user_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "marked_as_read" in data
        assert data["last_read_message_id"] == message_id



