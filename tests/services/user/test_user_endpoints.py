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
        # Регистрируем и входим
        register_url = f"{base_url}{api_path}/register"
        requests.post(register_url, json=valid_user_data)

        login_url = f"{base_url}{api_path}/login"
        login_response = requests.post(login_url, json=login_data)
        access_token = login_response.json()["access_token"]

        # Получаем профиль
        url = f"{user_service_url}{user_api_path}/me"
        response = requests.get(url, headers={"Authorization": f"Bearer {access_token}"})

        assert response.status_code == 200
        data = response.json()
        assert data["login"] == valid_user_data["login"]
        assert data["surname"] == valid_user_data["surname"]
        assert data["name"] == valid_user_data["name"]
        assert data["status"] == 1  # Онлайн после входа

    def test_update_me_success(self, user_service_url, user_api_path, base_url, api_path, valid_user_data, login_data):
        """Обновление своего профиля"""
        # Регистрируем и входим
        requests.post(f"{base_url}{api_path}/register", json=valid_user_data)
        login_response = requests.post(f"{base_url}{api_path}/login", json=login_data)
        access_token = login_response.json()["access_token"]

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
            headers={"Authorization": f"Bearer {access_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["surname"] == "Petrov"
        assert data["name"] == "Petr"
        assert data["patronymic"] == "Petrovich"

    def test_update_status(self, user_service_url, user_api_path, base_url, api_path, valid_user_data, login_data):
        """Обновление статуса"""
        # Регистрируем и входим
        requests.post(f"{base_url}{api_path}/register", json=valid_user_data)
        login_response = requests.post(f"{base_url}{api_path}/login", json=login_data)
        access_token = login_response.json()["access_token"]

        # Обновляем статус на "Не беспокоить" (2)
        url = f"{user_service_url}{user_api_path}/me/status"
        response = requests.put(
            url,
            json={"status": 2},
            headers={"Authorization": f"Bearer {access_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == 2

        # Проверяем через GetMe
        get_url = f"{user_service_url}{user_api_path}/me"
        get_response = requests.get(get_url, headers={"Authorization": f"Bearer {access_token}"})
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

    def test_get_workspace_users(self, user_service_url, user_api_path, base_url, api_path, valid_user_data, login_data, db_cursor, clean_workspace_data):
        """Получение пользователей рабочего пространства"""
        # 1. Регистрируем пользователя
        requests.post(f"{base_url}{api_path}/register", json=valid_user_data)
        login_response = requests.post(f"{base_url}{api_path}/login", json=login_data)
        access_token = login_response.json()["access_token"]
        user_id = login_response.json()["user"]["id"]

        # 2. Создаем Workspace и привязываем пользователя через БД (так как Workspace Service может быть недоступен)
        # Создаем тариф (если нет)
        db_cursor.execute("INSERT INTO tariffs (name, description) VALUES ('Free', 'Free tariff') ON CONFLICT DO NOTHING RETURNING id")
        tariff_id_row = db_cursor.fetchone()
        if not tariff_id_row:
             db_cursor.execute("SELECT id FROM tariffs WHERE name = 'Free'")
             tariff_id = db_cursor.fetchone()['id']
        else:
             tariff_id = tariff_id_row['id']

        # Создаем Workspace
        db_cursor.execute(
            "INSERT INTO workspaces (name, creator, tariffsid) VALUES (%s, %s, %s) RETURNING id",
            (f"TestWorkspace_{user_id}", user_id, tariff_id)
        )
        workspace_id = db_cursor.fetchone()['id']

        # Добавляем пользователя в Workspace
        db_cursor.execute(
            'INSERT INTO "userInWorkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (user_id, workspace_id, 1) # 1 = Owner/Admin
        )

        # 3. Запрашиваем пользователей Workspace
        url = f"{user_service_url}{user_api_path}/workspace/{workspace_id}"
        response = requests.get(url, headers={"Authorization": f"Bearer {access_token}"})

        assert response.status_code == 200
        data = response.json()
        assert len(data["users"]) == 1
        assert data["users"][0]["id"] == user_id
        assert data["users"][0]["role"] == 1

    def test_get_workspace_users_forbidden(self, user_service_url, user_api_path, base_url, api_path, valid_user_data, login_data, db_cursor, clean_workspace_data):
        """Попытка получить пользователей чужого РП"""
        # 1. Регистрируем пользователя 1 (Владелец РП)
        requests.post(f"{base_url}{api_path}/register", json=valid_user_data)
        login_response = requests.post(f"{base_url}{api_path}/login", json=login_data)
        user1_id = login_response.json()["user"]["id"]

        # 2. Создаем РП для пользователя 1
        db_cursor.execute("INSERT INTO tariffs (name, description) VALUES ('Free', 'Free tariff') ON CONFLICT DO NOTHING RETURNING id")
        tariff_id_row = db_cursor.fetchone()
        if not tariff_id_row:
             db_cursor.execute("SELECT id FROM tariffs WHERE name = 'Free'")
             tariff_id = db_cursor.fetchone()['id']
        else:
             tariff_id = tariff_id_row['id']
             
        db_cursor.execute(
            "INSERT INTO workspaces (name, creator, tariffsid) VALUES (%s, %s, %s) RETURNING id",
            (f"TestWorkspace_{user1_id}", user1_id, tariff_id)
        )
        workspace_id = db_cursor.fetchone()['id']
        
        db_cursor.execute(
            'INSERT INTO "userInWorkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (user1_id, workspace_id, 1)
        )

        # 3. Регистрируем пользователя 2 (Посторонний)
        user2_data = valid_user_data.copy()
        user2_data["login"] = "intruder@example.com"
        requests.post(f"{base_url}{api_path}/register", json=user2_data)
        login_response2 = requests.post(f"{base_url}{api_path}/login", json={"login": user2_data["login"], "password": user2_data["password"]})
        access_token2 = login_response2.json()["access_token"]

        # 4. Пользователь 2 пытается получить список пользователей РП пользователя 1
        url = f"{user_service_url}{user_api_path}/workspace/{workspace_id}"
        response = requests.get(url, headers={"Authorization": f"Bearer {access_token2}"})

        assert response.status_code == 403
