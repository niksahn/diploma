"""
Функциональные тесты для Workspace Service

Покрывает эндпоинты:
- POST /api/v1/workspaces
- GET /api/v1/workspaces
- GET /api/v1/workspaces/:id
- PUT /api/v1/workspaces/:id
- DELETE /api/v1/workspaces/:id
- POST /api/v1/workspaces/:id/members
- GET /api/v1/workspaces/:id/members
- PUT /api/v1/workspaces/:id/members/:user_id
- DELETE /api/v1/workspaces/:id/members/:user_id
- PUT /api/v1/workspaces/:id/leader
- GET /api/v1/workspaces/tariffs
- POST /api/v1/workspaces/tariffs
- PUT /api/v1/workspaces/tariffs/:id
"""
import pytest
import requests
import time


class TestWorkspaceManagement:
    """Тесты управления рабочими пространствами"""

    def test_create_workspace_success(
        self, workspace_service_url, workspace_api_path, admin_token, 
        workspace_data, clean_workspace_data
    ):
        """Создание рабочего пространства администратором"""
        url = f"{workspace_service_url}{workspace_api_path}"
        response = requests.post(
            url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == workspace_data["name"]
        assert data["tariffs_id"] == workspace_data["tariff_id"]
        assert "id" in data
        assert "created_at" in data

    def test_create_workspace_unauthorized(
        self, workspace_service_url, workspace_api_path, workspace_data
    ):
        """Создание РП без токена"""
        url = f"{workspace_service_url}{workspace_api_path}"
        response = requests.post(url, json=workspace_data)

        assert response.status_code == 401

    def test_create_workspace_forbidden(
        self, workspace_service_url, workspace_api_path, user_token, 
        workspace_data
    ):
        """Создание РП обычным пользователем (не администратором)"""
        url = f"{workspace_service_url}{workspace_api_path}"
        response = requests.post(
            url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 403

    def test_create_workspace_invalid_data(
        self, workspace_service_url, workspace_api_path, admin_token
    ):
        """Создание РП с невалидными данными"""
        url = f"{workspace_service_url}{workspace_api_path}"
        
        # Пустое имя
        response = requests.post(
            url,
            json={"name": "", "tariff_id": 1, "leader_id": 1},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400

        # Слишком короткое имя
        response = requests.post(
            url,
            json={"name": "ab", "tariff_id": 1, "leader_id": 1},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400

    def test_create_workspace_duplicate_name(
        self, workspace_service_url, workspace_api_path, admin_token, 
        workspace_data, clean_workspace_data
    ):
        """Создание РП с дублирующимся именем"""
        url = f"{workspace_service_url}{workspace_api_path}"
        
        # Создаем первое РП
        requests.post(
            url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # Пытаемся создать второе с тем же именем
        response = requests.post(
            url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 409

    def test_get_workspaces_list(
        self, workspace_service_url, workspace_api_path, admin_token, 
        user_token, workspace_data, db_cursor, clean_workspace_data
    ):
        """Получение списка РП текущего пользователя"""
        # Создаем РП
        create_url = f"{workspace_service_url}{workspace_api_path}"
        create_response = requests.post(
            create_url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        workspace_id = create_response.json()["id"]

        # Добавляем пользователя в РП через БД
        db_cursor.execute(
            'INSERT INTO "userInWorkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (user_token['user_id'], workspace_id, 1)
        )

        # Получаем список РП от имени пользователя
        list_url = f"{workspace_service_url}{workspace_api_path}"
        response = requests.get(
            list_url,
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "workspaces" in data
        assert "total" in data
        assert data["total"] >= 1
        assert any(ws["id"] == workspace_id for ws in data["workspaces"])

    def test_get_workspace_by_id(
        self, workspace_service_url, workspace_api_path, admin_token, 
        user_token, workspace_data, db_cursor, clean_workspace_data
    ):
        """Получение информации о РП по ID"""
        # Создаем РП
        create_url = f"{workspace_service_url}{workspace_api_path}"
        create_response = requests.post(
            create_url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        workspace_id = create_response.json()["id"]

        # Добавляем пользователя в РП
        db_cursor.execute(
            'INSERT INTO "userInWorkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (user_token['user_id'], workspace_id, 1)
        )

        # Получаем информацию о РП
        url = f"{workspace_service_url}{workspace_api_path}/{workspace_id}"
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == workspace_id
        assert data["name"] == workspace_data["name"]
        assert "tariff" in data
        assert "members_count" in data
        assert "created_at" in data

    def test_get_workspace_not_member(
        self, workspace_service_url, workspace_api_path, admin_token, 
        user_token, workspace_data, clean_workspace_data
    ):
        """Попытка получить информацию о РП, в котором пользователь не состоит"""
        # Создаем РП
        create_url = f"{workspace_service_url}{workspace_api_path}"
        create_response = requests.post(
            create_url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        workspace_id = create_response.json()["id"]

        # Пытаемся получить информацию от имени пользователя, не состоящего в РП
        url = f"{workspace_service_url}{workspace_api_path}/{workspace_id}"
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 403

    def test_get_workspace_not_found(
        self, workspace_service_url, workspace_api_path, user_token
    ):
        """Получение несуществующего РП"""
        url = f"{workspace_service_url}{workspace_api_path}/99999"
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 404

    def test_update_workspace_success(
        self, workspace_service_url, workspace_api_path, admin_token, 
        user_token, workspace_data, db_cursor, clean_workspace_data, tariff_id
    ):
        """Обновление РП руководителем"""
        # Создаем РП
        create_url = f"{workspace_service_url}{workspace_api_path}"
        create_response = requests.post(
            create_url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        workspace_id = create_response.json()["id"]

        # Добавляем пользователя как руководителя (role = 2)
        db_cursor.execute(
            'INSERT INTO "userInWorkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (user_token['user_id'], workspace_id, 2)
        )

        # Создаем новый тариф для обновления
        db_cursor.execute(
            "INSERT INTO tariffs (name, description) VALUES ('New Tariff', 'New Description') RETURNING id"
        )
        new_tariff_id = db_cursor.fetchone()['id']

        # Обновляем РП
        update_data = {
            "name": "Updated Workspace Name",
            "tariff_id": new_tariff_id
        }
        url = f"{workspace_service_url}{workspace_api_path}/{workspace_id}"
        response = requests.put(
            url,
            json=update_data,
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["tariff_id"] == new_tariff_id

    def test_update_workspace_forbidden(
        self, workspace_service_url, workspace_api_path, admin_token, 
        user_token, workspace_data, db_cursor, clean_workspace_data
    ):
        """Попытка обновить РП обычным участником (не руководителем)"""
        # Создаем РП
        create_url = f"{workspace_service_url}{workspace_api_path}"
        create_response = requests.post(
            create_url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        workspace_id = create_response.json()["id"]

        # Добавляем пользователя как обычного участника (role = 1)
        db_cursor.execute(
            'INSERT INTO "userInWorkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (user_token['user_id'], workspace_id, 1)
        )

        # Пытаемся обновить РП
        update_data = {"name": "Updated Name"}
        url = f"{workspace_service_url}{workspace_api_path}/{workspace_id}"
        response = requests.put(
            url,
            json=update_data,
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 403

    def test_delete_workspace_success(
        self, workspace_service_url, workspace_api_path, admin_token, 
        workspace_data, clean_workspace_data
    ):
        """Удаление РП администратором"""
        # Создаем РП
        create_url = f"{workspace_service_url}{workspace_api_path}"
        create_response = requests.post(
            create_url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        workspace_id = create_response.json()["id"]

        # Удаляем РП
        url = f"{workspace_service_url}{workspace_api_path}/{workspace_id}"
        response = requests.delete(
            url,
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 204

    def test_delete_workspace_forbidden(
        self, workspace_service_url, workspace_api_path, admin_token, 
        user_token, workspace_data, clean_workspace_data
    ):
        """Попытка удалить РП не администратором"""
        # Создаем РП
        create_url = f"{workspace_service_url}{workspace_api_path}"
        create_response = requests.post(
            create_url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        workspace_id = create_response.json()["id"]

        # Пытаемся удалить РП обычным пользователем
        url = f"{workspace_service_url}{workspace_api_path}/{workspace_id}"
        response = requests.delete(
            url,
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 403


class TestWorkspaceMembers:
    """Тесты управления участниками РП"""

    def test_add_member_success(
        self, workspace_service_url, workspace_api_path, admin_token, 
        user_token, workspace_data, db_cursor, clean_workspace_data, 
        auth_service_url, auth_api_path, unique_timestamp
    ):
        """Добавление участника в РП"""
        # Создаем РП
        create_url = f"{workspace_service_url}{workspace_api_path}"
        create_response = requests.post(
            create_url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        workspace_id = create_response.json()["id"]

        # Добавляем пользователя как руководителя
        db_cursor.execute(
            'INSERT INTO "userInWorkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (user_token['user_id'], workspace_id, 2)
        )

        # Создаем второго пользователя для добавления
        new_user_data = {
            "login": f"newuser{unique_timestamp}@example.com",
            "password": "Password123",
            "surname": "Petrov",
            "name": "Petr",
            "patronymic": "Petrovich"
        }
        register_url = f"{auth_service_url}{auth_api_path}/register"
        requests.post(register_url, json=new_user_data)
        
        login_url = f"{auth_service_url}{auth_api_path}/login"
        login_response = requests.post(login_url, json={
            "login": new_user_data["login"],
            "password": new_user_data["password"]
        })
        new_user_id = login_response.json()["user"]["id"]

        # Добавляем нового пользователя в РП
        url = f"{workspace_service_url}{workspace_api_path}/{workspace_id}/members"
        response = requests.post(
            url,
            json={"user_id": new_user_id, "role": 1},
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["user_id"] == new_user_id
        assert data["workspace_id"] == workspace_id
        assert data["role"] == 1

    def test_add_member_forbidden(
        self, workspace_service_url, workspace_api_path, admin_token, 
        user_token, workspace_data, db_cursor, clean_workspace_data
    ):
        """Попытка добавить участника обычным участником (не руководителем)"""
        # Создаем РП
        create_url = f"{workspace_service_url}{workspace_api_path}"
        create_response = requests.post(
            create_url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        workspace_id = create_response.json()["id"]

        # Добавляем пользователя как обычного участника (role = 1)
        db_cursor.execute(
            'INSERT INTO "userInWorkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (user_token['user_id'], workspace_id, 1)
        )

        # Пытаемся добавить нового участника
        url = f"{workspace_service_url}{workspace_api_path}/{workspace_id}/members"
        response = requests.post(
            url,
            json={"user_id": 999, "role": 1},
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 403

    def test_add_member_already_exists(
        self, workspace_service_url, workspace_api_path, admin_token, 
        user_token, workspace_data, db_cursor, clean_workspace_data
    ):
        """Попытка добавить пользователя, который уже является участником"""
        # Создаем РП
        create_url = f"{workspace_service_url}{workspace_api_path}"
        create_response = requests.post(
            create_url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        workspace_id = create_response.json()["id"]

        # Добавляем пользователя как руководителя
        db_cursor.execute(
            'INSERT INTO "userInWorkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (user_token['user_id'], workspace_id, 2)
        )

        # Пытаемся добавить того же пользователя снова
        url = f"{workspace_service_url}{workspace_api_path}/{workspace_id}/members"
        response = requests.post(
            url,
            json={"user_id": user_token['user_id'], "role": 1},
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 409

    def test_get_members_list(
        self, workspace_service_url, workspace_api_path, admin_token, 
        user_token, workspace_data, db_cursor, clean_workspace_data
    ):
        """Получение списка участников РП"""
        # Создаем РП
        create_url = f"{workspace_service_url}{workspace_api_path}"
        create_response = requests.post(
            create_url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        workspace_id = create_response.json()["id"]

        # Добавляем пользователя в РП
        db_cursor.execute(
            'INSERT INTO "userInWorkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (user_token['user_id'], workspace_id, 1)
        )

        # Получаем список участников
        url = f"{workspace_service_url}{workspace_api_path}/{workspace_id}/members"
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "members" in data
        assert "total" in data
        assert data["total"] >= 1
        assert any(member["user_id"] == user_token['user_id'] for member in data["members"])

    def test_get_members_forbidden(
        self, workspace_service_url, workspace_api_path, admin_token, 
        user_token, workspace_data, clean_workspace_data
    ):
        """Попытка получить список участников РП, в котором пользователь не состоит"""
        # Создаем РП
        create_url = f"{workspace_service_url}{workspace_api_path}"
        create_response = requests.post(
            create_url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        workspace_id = create_response.json()["id"]

        # Пытаемся получить список участников
        url = f"{workspace_service_url}{workspace_api_path}/{workspace_id}/members"
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 403

    def test_update_member_role(
        self, workspace_service_url, workspace_api_path, admin_token, 
        user_token, workspace_data, db_cursor, clean_workspace_data,
        auth_service_url, auth_api_path, unique_timestamp
    ):
        """Изменение роли участника РП"""
        # Создаем РП
        create_url = f"{workspace_service_url}{workspace_api_path}"
        create_response = requests.post(
            create_url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        workspace_id = create_response.json()["id"]

        # Добавляем пользователя как руководителя
        db_cursor.execute(
            'INSERT INTO "userInWorkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (user_token['user_id'], workspace_id, 2)
        )

        # Создаем второго пользователя
        new_user_data = {
            "login": f"member{unique_timestamp}@example.com",
            "password": "Password123",
            "surname": "Sidorov",
            "name": "Sidr",
            "patronymic": "Sidorovich"
        }
        register_url = f"{auth_service_url}{auth_api_path}/register"
        requests.post(register_url, json=new_user_data)
        
        login_url = f"{auth_service_url}{auth_api_path}/login"
        login_response = requests.post(login_url, json={
            "login": new_user_data["login"],
            "password": new_user_data["password"]
        })
        new_user_id = login_response.json()["user"]["id"]

        # Добавляем второго пользователя как обычного участника
        db_cursor.execute(
            'INSERT INTO "userInWorkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (new_user_id, workspace_id, 1)
        )

        # Изменяем роль на руководителя
        url = f"{workspace_service_url}{workspace_api_path}/{workspace_id}/members/{new_user_id}"
        response = requests.put(
            url,
            json={"role": 2},
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["role"] == 2

    def test_update_member_role_forbidden(
        self, workspace_service_url, workspace_api_path, admin_token, 
        user_token, workspace_data, db_cursor, clean_workspace_data
    ):
        """Попытка изменить роль участника обычным участником"""
        # Создаем РП
        create_url = f"{workspace_service_url}{workspace_api_path}"
        create_response = requests.post(
            create_url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        workspace_id = create_response.json()["id"]

        # Добавляем пользователя как обычного участника (role = 1)
        db_cursor.execute(
            'INSERT INTO "userInWorkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (user_token['user_id'], workspace_id, 1)
        )

        # Пытаемся изменить роль
        url = f"{workspace_service_url}{workspace_api_path}/{workspace_id}/members/999"
        response = requests.put(
            url,
            json={"role": 2},
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 403

    def test_remove_member_success(
        self, workspace_service_url, workspace_api_path, admin_token, 
        user_token, workspace_data, db_cursor, clean_workspace_data,
        auth_service_url, auth_api_path, unique_timestamp
    ):
        """Удаление участника из РП"""
        # Создаем РП
        create_url = f"{workspace_service_url}{workspace_api_path}"
        create_response = requests.post(
            create_url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        workspace_id = create_response.json()["id"]

        # Добавляем пользователя как руководителя
        db_cursor.execute(
            'INSERT INTO "userInWorkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (user_token['user_id'], workspace_id, 2)
        )

        # Создаем второго пользователя
        new_user_data = {
            "login": f"removeme{unique_timestamp}@example.com",
            "password": "Password123",
            "surname": "Removov",
            "name": "Remove",
            "patronymic": "Removovich"
        }
        register_url = f"{auth_service_url}{auth_api_path}/register"
        requests.post(register_url, json=new_user_data)
        
        login_url = f"{auth_service_url}{auth_api_path}/login"
        login_response = requests.post(login_url, json={
            "login": new_user_data["login"],
            "password": new_user_data["password"]
        })
        new_user_id = login_response.json()["user"]["id"]

        # Добавляем второго пользователя в РП
        db_cursor.execute(
            'INSERT INTO "userInWorkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (new_user_id, workspace_id, 1)
        )

        # Удаляем второго пользователя из РП
        url = f"{workspace_service_url}{workspace_api_path}/{workspace_id}/members/{new_user_id}"
        response = requests.delete(
            url,
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 204

    def test_remove_member_forbidden(
        self, workspace_service_url, workspace_api_path, admin_token, 
        user_token, workspace_data, db_cursor, clean_workspace_data
    ):
        """Попытка удалить участника обычным участником"""
        # Создаем РП
        create_url = f"{workspace_service_url}{workspace_api_path}"
        create_response = requests.post(
            create_url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        workspace_id = create_response.json()["id"]

        # Добавляем пользователя как обычного участника (role = 1)
        db_cursor.execute(
            'INSERT INTO "userInWorkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (user_token['user_id'], workspace_id, 1)
        )

        # Пытаемся удалить участника
        url = f"{workspace_service_url}{workspace_api_path}/{workspace_id}/members/999"
        response = requests.delete(
            url,
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 403


class TestWorkspaceLeader:
    """Тесты смены руководителя РП"""

    def test_change_leader_success(
        self, workspace_service_url, workspace_api_path, admin_token, 
        user_token, workspace_data, db_cursor, clean_workspace_data,
        auth_service_url, auth_api_path, unique_timestamp
    ):
        """Смена руководителя РП"""
        # Создаем РП
        create_url = f"{workspace_service_url}{workspace_api_path}"
        create_response = requests.post(
            create_url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        workspace_id = create_response.json()["id"]

        # Добавляем пользователя как руководителя
        db_cursor.execute(
            'INSERT INTO "userInWorkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (user_token['user_id'], workspace_id, 2)
        )

        # Создаем второго пользователя
        new_user_data = {
            "login": f"newleader{unique_timestamp}@example.com",
            "password": "Password123",
            "surname": "Leaderov",
            "name": "Leader",
            "patronymic": "Leaderovich"
        }
        register_url = f"{auth_service_url}{auth_api_path}/register"
        requests.post(register_url, json=new_user_data)
        
        login_url = f"{auth_service_url}{auth_api_path}/login"
        login_response = requests.post(login_url, json={
            "login": new_user_data["login"],
            "password": new_user_data["password"]
        })
        new_user_id = login_response.json()["user"]["id"]

        # Добавляем второго пользователя как обычного участника
        db_cursor.execute(
            'INSERT INTO "userInWorkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (new_user_id, workspace_id, 1)
        )

        # Меняем руководителя
        url = f"{workspace_service_url}{workspace_api_path}/{workspace_id}/leader"
        response = requests.put(
            url,
            json={"new_leader_id": new_user_id},
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["workspace_id"] == workspace_id
        assert data["old_leader_id"] == user_token['user_id']
        assert data["new_leader_id"] == new_user_id

    def test_change_leader_forbidden(
        self, workspace_service_url, workspace_api_path, admin_token, 
        user_token, workspace_data, db_cursor, clean_workspace_data
    ):
        """Попытка сменить руководителя обычным участником"""
        # Создаем РП
        create_url = f"{workspace_service_url}{workspace_api_path}"
        create_response = requests.post(
            create_url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        workspace_id = create_response.json()["id"]

        # Добавляем пользователя как обычного участника (role = 1)
        db_cursor.execute(
            'INSERT INTO "userInWorkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (user_token['user_id'], workspace_id, 1)
        )

        # Пытаемся сменить руководителя
        url = f"{workspace_service_url}{workspace_api_path}/{workspace_id}/leader"
        response = requests.put(
            url,
            json={"new_leader_id": 999},
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 403

    def test_change_leader_not_member(
        self, workspace_service_url, workspace_api_path, admin_token, 
        user_token, workspace_data, db_cursor, clean_workspace_data
    ):
        """Попытка назначить руководителем пользователя, не являющегося участником РП"""
        # Создаем РП
        create_url = f"{workspace_service_url}{workspace_api_path}"
        create_response = requests.post(
            create_url,
            json=workspace_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        workspace_id = create_response.json()["id"]

        # Добавляем пользователя как руководителя
        db_cursor.execute(
            'INSERT INTO "userInWorkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (user_token['user_id'], workspace_id, 2)
        )

        # Пытаемся назначить руководителем пользователя, не состоящего в РП
        url = f"{workspace_service_url}{workspace_api_path}/{workspace_id}/leader"
        response = requests.put(
            url,
            json={"new_leader_id": 99999},
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 404


class TestTariffs:
    """Тесты управления тарифами"""

    def test_get_tariffs_list(self, workspace_service_url, workspace_api_path, db_cursor):
        """Получение списка тарифов (публичный эндпоинт)"""
        # Создаем несколько тарифов
        db_cursor.execute(
            "INSERT INTO tariffs (name, description) VALUES ('Basic', 'Basic plan') ON CONFLICT DO NOTHING"
        )
        db_cursor.execute(
            "INSERT INTO tariffs (name, description) VALUES ('Pro', 'Professional plan') ON CONFLICT DO NOTHING"
        )

        url = f"{workspace_service_url}{workspace_api_path}/tariffs"
        response = requests.get(url)

        assert response.status_code == 200
        data = response.json()
        assert "tariffs" in data
        assert len(data["tariffs"]) >= 2

    def test_create_tariff_success(
        self, workspace_service_url, workspace_api_path, admin_token, unique_timestamp
    ):
        """Создание нового тарифа администратором"""
        tariff_data = {
            "name": f"Premium{unique_timestamp}",
            "description": "Premium plan features"
        }

        url = f"{workspace_service_url}{workspace_api_path}/tariffs"
        response = requests.post(
            url,
            json=tariff_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == tariff_data["name"]
        assert data["description"] == tariff_data["description"]
        assert "id" in data

    def test_create_tariff_unauthorized(
        self, workspace_service_url, workspace_api_path
    ):
        """Создание тарифа без токена"""
        tariff_data = {
            "name": "Unauthorized Tariff",
            "description": "This should fail"
        }

        url = f"{workspace_service_url}{workspace_api_path}/tariffs"
        response = requests.post(url, json=tariff_data)

        assert response.status_code == 401

    def test_create_tariff_forbidden(
        self, workspace_service_url, workspace_api_path, user_token
    ):
        """Создание тарифа обычным пользователем"""
        tariff_data = {
            "name": "Forbidden Tariff",
            "description": "This should fail"
        }

        url = f"{workspace_service_url}{workspace_api_path}/tariffs"
        response = requests.post(
            url,
            json=tariff_data,
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 403

    def test_create_tariff_duplicate_name(
        self, workspace_service_url, workspace_api_path, admin_token, 
        db_cursor, unique_timestamp
    ):
        """Создание тарифа с дублирующимся именем"""
        tariff_name = f"DuplicateTariff{unique_timestamp}"
        
        # Создаем первый тариф через БД
        db_cursor.execute(
            "INSERT INTO tariffs (name, description) VALUES (%s, %s)",
            (tariff_name, "First tariff")
        )

        # Пытаемся создать второй с тем же именем через API
        tariff_data = {
            "name": tariff_name,
            "description": "Second tariff"
        }

        url = f"{workspace_service_url}{workspace_api_path}/tariffs"
        response = requests.post(
            url,
            json=tariff_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 409

    def test_update_tariff_success(
        self, workspace_service_url, workspace_api_path, admin_token, 
        db_cursor, unique_timestamp
    ):
        """Обновление тарифа администратором"""
        # Создаем тариф
        tariff_name = f"UpdateTariff{unique_timestamp}"
        db_cursor.execute(
            "INSERT INTO tariffs (name, description) VALUES (%s, %s) RETURNING id",
            (tariff_name, "Original description")
        )
        tariff_id = db_cursor.fetchone()['id']

        # Обновляем тариф
        update_data = {
            "name": f"UpdatedTariff{unique_timestamp}",
            "description": "Updated description"
        }

        url = f"{workspace_service_url}{workspace_api_path}/tariffs/{tariff_id}"
        response = requests.put(
            url,
            json=update_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["description"] == update_data["description"]

    def test_update_tariff_forbidden(
        self, workspace_service_url, workspace_api_path, user_token, tariff_id
    ):
        """Попытка обновить тариф обычным пользователем"""
        update_data = {
            "name": "Forbidden Update",
            "description": "This should fail"
        }

        url = f"{workspace_service_url}{workspace_api_path}/tariffs/{tariff_id}"
        response = requests.put(
            url,
            json=update_data,
            headers={"Authorization": f"Bearer {user_token['token']}"}
        )

        assert response.status_code == 403

    def test_update_tariff_not_found(
        self, workspace_service_url, workspace_api_path, admin_token
    ):
        """Обновление несуществующего тарифа"""
        update_data = {
            "name": "Not Found",
            "description": "This should fail"
        }

        url = f"{workspace_service_url}{workspace_api_path}/tariffs/99999"
        response = requests.put(
            url,
            json=update_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 404
