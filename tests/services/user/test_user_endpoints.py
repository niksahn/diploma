"""
Функциональные тесты для User Service

Покрывает эндпоинты:
- GET /api/v1/users/me
- PUT /api/v1/users/me
- GET /api/v1/users/:id
- PUT /api/v1/users/:id
- PUT /api/v1/users/me/status
- GET /api/v1/users
- GET /api/v1/users/workspace/:workspace_id
"""
import pytest
import requests
import time


class TestUserProfile:
    """Тесты профиля пользователя"""

    def test_get_me_success(self, user_service_url, user_api_path, base_url, api_path, valid_user_data, login_data):
        """Получение своего профиля"""
        # Регистрируем пользователя
        requests.post(f"{base_url}{api_path}/register", json=valid_user_data)
        # Входим
        login_response = requests.post(f"{base_url}{api_path}/login", json=login_data)
        user_id = login_response.json()["user"]["id"]

        # Получаем профиль через User Service с заголовками имитации API Gateway
        url = f"{user_service_url}{user_api_path}/me"
        response = requests.get(url, headers={"X-User-ID": str(user_id), "X-User-Role": "user"})

        assert response.status_code == 200
        data = response.json()
        assert "login" in data
        assert "surname" in data
        assert "name" in data
        assert data["status"] == 1  # Онлайн после логина

    def test_update_me_success(self, user_service_url, user_api_path, base_url, api_path, valid_user_data, login_data):
        """Обновление своего профиля"""
        # Регистрируем пользователя
        requests.post(f"{base_url}{api_path}/register", json=valid_user_data)
        # Входим
        login_response = requests.post(f"{base_url}{api_path}/login", json=login_data)
        user_id = login_response.json()["user"]["id"]

        # Обновляем профиль
        update_data = {
            "surname": "Petrov",
            "name": "Petr",
            "patronymic": "Petrovich"
        }
        url = f"{user_service_url}{user_api_path}/me"
        response = requests.put(
            url,
            json=update_data,
            headers={"X-User-ID": str(user_id), "X-User-Role": "user"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["surname"] == "Petrov"
        assert data["name"] == "Petr"
        assert data["patronymic"] == "Petrovich"

    def test_update_status(self, user_service_url, user_api_path, base_url, api_path, valid_user_data, login_data):
        """Обновление статуса"""
        # Регистрируем пользователя
        requests.post(f"{base_url}{api_path}/register", json=valid_user_data)
        # Входим
        login_response = requests.post(f"{base_url}{api_path}/login", json=login_data)
        user_id = login_response.json()["user"]["id"]

        # Обновляем статус на "Не беспокоить" (2)
        url = f"{user_service_url}{user_api_path}/me/status"
        response = requests.put(
            url,
            json={"status": 2},
            headers={"X-User-ID": str(user_id), "X-User-Role": "user"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 2

        # Проверяем через GetMe
        get_url = f"{user_service_url}{user_api_path}/me"
        get_response = requests.get(get_url, headers={"X-User-ID": str(user_id), "X-User-Role": "user"})
        assert get_response.json()["status"] == 2


class TestUserSearch:
    """Тесты поиска пользователей"""

    def test_search_users(self, user_service_url, user_api_path, base_url, api_path, unique_timestamp):
        """Поиск пользователей"""
        # Создаем 3 пользователей
        users = []
        for i in range(3):
            user_data = {
                "login": f"search_user_{i}_{unique_timestamp}@example.com",
                "password": "Password123",
                "surname": f"SearchSurname{unique_timestamp}",
                "name": f"SearchName{i}",
            }
            requests.post(f"{base_url}{api_path}/register", json=user_data)
            users.append(user_data)

        # Входим первым пользователем для поиска
        login_data = {"login": users[0]["login"], "password": users[0]["password"]}
        login_response = requests.post(f"{base_url}{api_path}/login", json=login_data)
        access_token = login_response.json()["access_token"]

        # Ищем по фамилии
        url = f"{user_service_url}{user_api_path}"
        response = requests.get(
            url,
            params={"search": f"SearchSurname{unique_timestamp}"},
            headers={"Authorization": f"Bearer {access_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["users"]) >= 3
        assert data["total"] >= 3


class TestWorkspaceUsers:
    """Тесты пользователей в рабочем пространстве"""

    def test_get_workspace_users(self, user_service_url, user_api_path):
        """Получение пользователей рабочего пространства"""
        # Используем фиксированный workspace_id = 1001 из подготовленных данных
        workspace_id = 1001
        user_id = 1001  # test_user_1 из SQL скрипта

        # Запрашиваем пользователей Workspace
        url = f"{user_service_url}{user_api_path}/workspace/{workspace_id}"
        response = requests.get(url, headers={"X-User-ID": str(user_id), "X-User-Role": "user"})

        assert response.status_code == 200
        data = response.json()
        assert len(data["users"]) == 2  # user 1001 (role 2) и user 1002 (role 1) из SQL скрипта
        assert data["users"][0]["id"] == 1001
        assert data["users"][0]["role"] == 2  # руководитель
        assert data["users"][1]["id"] == 1002
        assert data["users"][1]["role"] == 1  # участник

    def test_get_workspace_users_forbidden(self, user_service_url, user_api_path):
        """Попытка получить пользователей чужого РП"""
        # Используем фиксированные workspace_id из подготовленных данных
        # workspace 1001 содержит пользователей 1001 и 1002
        # workspace 1002 содержит пользователя 1003
        # Пользователь 1003 (не участник workspace 1001) пытается получить workspace 1001
        workspace_id = 1001  # workspace с пользователями 1001 и 1002
        user_id = 1003  # пользователь из workspace 1002

        url = f"{user_service_url}{user_api_path}/workspace/{workspace_id}"
        response = requests.get(url, headers={"X-User-ID": str(user_id), "X-User-Role": "user"})

        assert response.status_code == 403
