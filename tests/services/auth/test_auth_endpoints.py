"""
Функциональные тесты для Auth Service

Покрывает все эндпоинты из server/plans/api/auth_service.md:
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout
- POST /api/v1/auth/admin/login
- POST /api/v1/auth/admin/register
- POST /api/v1/auth/validate
"""
import pytest
import requests
import time


class TestUserRegister:
    """Тесты для POST /api/v1/auth/register"""

    def test_register_success(self, base_url, api_path, valid_user_data):
        """Успешная регистрация пользователя"""
        url = f"{base_url}{api_path}/register"
        response = requests.post(url, json=valid_user_data)

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["login"] == valid_user_data["login"]
        assert data["message"] == "User created successfully"
        assert isinstance(data["id"], int)
        assert data["id"] > 0

    def test_register_duplicate_login(self, base_url, api_path, valid_user_data):
        """Регистрация с уже существующим login должна вернуть 409"""
        # Сначала регистрируем пользователя
        url = f"{base_url}{api_path}/register"
        first_response = requests.post(url, json=valid_user_data)
        assert first_response.status_code == 201  # Убеждаемся, что первая регистрация успешна

        # Пытаемся зарегистрировать с тем же login
        response = requests.post(url, json=valid_user_data)

        assert response.status_code == 409
        data = response.json()
        assert "error" in data
        assert data["error"] == "conflict"

    def test_register_invalid_login_too_short(self, base_url, api_path, valid_user_data):
        """Регистрация с login менее 3 символов должна вернуть 400"""
        invalid_data = valid_user_data.copy()
        invalid_data["login"] = "ab"
        url = f"{base_url}{api_path}/register"
        response = requests.post(url, json=invalid_data)

        assert response.status_code == 400
        data = response.json()
        assert "error" in data

    def test_register_invalid_login_too_long(self, base_url, api_path, valid_user_data):
        """Регистрация с login более 50 символов должна вернуть 400"""
        invalid_data = valid_user_data.copy()
        invalid_data["login"] = "a" * 51
        url = f"{base_url}{api_path}/register"
        response = requests.post(url, json=invalid_data)

        assert response.status_code == 400
        data = response.json()
        assert "error" in data

    def test_register_invalid_password_too_short(self, base_url, api_path, valid_user_data):
        """Регистрация с паролем менее 8 символов должна вернуть 400"""
        invalid_data = valid_user_data.copy()
        invalid_data["password"] = "short"
        url = f"{base_url}{api_path}/register"
        response = requests.post(url, json=invalid_data)

        assert response.status_code == 400
        data = response.json()
        assert "error" in data

    def test_register_invalid_surname_too_short(self, base_url, api_path, valid_user_data):
        """Регистрация с фамилией менее 2 символов должна вернуть 400"""
        invalid_data = valid_user_data.copy()
        invalid_data["surname"] = "A"
        url = f"{base_url}{api_path}/register"
        response = requests.post(url, json=invalid_data)

        assert response.status_code == 400
        data = response.json()
        assert "error" in data

    def test_register_invalid_name_too_short(self, base_url, api_path, valid_user_data):
        """Регистрация с именем менее 2 символов должна вернуть 400"""
        invalid_data = valid_user_data.copy()
        invalid_data["name"] = "A"
        url = f"{base_url}{api_path}/register"
        response = requests.post(url, json=invalid_data)

        assert response.status_code == 400
        data = response.json()
        assert "error" in data

    def test_register_missing_required_fields(self, base_url, api_path):
        """Регистрация без обязательных полей должна вернуть 400"""
        url = f"{base_url}{api_path}/register"
        response = requests.post(url, json={})

        assert response.status_code == 400
        data = response.json()
        assert "error" in data

    def test_register_without_patronymic(self, base_url, api_path, unique_timestamp):
        """Регистрация без отчества должна быть успешной (опциональное поле)"""
        data_without_patronymic = {
            "login": f"user{unique_timestamp}@example.com",
            "password": "SecurePassword123",
            "surname": "Ivanov",
            "name": "Ivan"
        }
        url = f"{base_url}{api_path}/register"
        response = requests.post(url, json=data_without_patronymic)

        assert response.status_code == 201
        data = response.json()
        assert "id" in data


class TestUserLogin:
    """Тесты для POST /api/v1/auth/login"""

    def test_login_success(self, base_url, api_path, valid_user_data, login_data):
        """Успешный вход пользователя"""
        # Сначала регистрируем пользователя
        register_url = f"{base_url}{api_path}/register"
        requests.post(register_url, json=valid_user_data)

        # Выполняем вход
        login_url = f"{base_url}{api_path}/login"
        response = requests.post(login_url, json=login_data)

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "expires_in" in data
        assert data["expires_in"] == 3600
        assert "user" in data
        assert data["user"]["login"] == login_data["login"]
        assert data["user"]["id"] > 0
        assert data["user"]["status"] == 1  # Статус должен быть "Онлайн"
        assert "name" in data["user"]
        assert "surname" in data["user"]

    def test_login_invalid_credentials(self, base_url, api_path):
        """Вход с неверными учетными данными должен вернуть 401"""
        url = f"{base_url}{api_path}/login"
        response = requests.post(url, json={
            "login": "nonexistent@example.com",
            "password": "WrongPassword123"
        })

        assert response.status_code == 401
        data = response.json()
        assert "error" in data
        assert data["error"] == "unauthorized"

    def test_login_wrong_password(self, base_url, api_path, valid_user_data, login_data):
        """Вход с неверным паролем должен вернуть 401"""
        # Сначала регистрируем пользователя
        register_url = f"{base_url}{api_path}/register"
        requests.post(register_url, json=valid_user_data)

        # Пытаемся войти с неверным паролем
        login_url = f"{base_url}{api_path}/login"
        wrong_login_data = login_data.copy()
        wrong_login_data["password"] = "WrongPassword123"
        response = requests.post(login_url, json=wrong_login_data)

        assert response.status_code == 401
        data = response.json()
        assert "error" in data
        assert data["error"] == "unauthorized"

    def test_login_missing_fields(self, base_url, api_path):
        """Вход без обязательных полей должен вернуть 400"""
        url = f"{base_url}{api_path}/login"
        response = requests.post(url, json={})

        assert response.status_code == 400
        data = response.json()
        assert "error" in data


class TestRefreshToken:
    """Тесты для POST /api/v1/auth/refresh"""

    def test_refresh_success(self, base_url, api_path, valid_user_data, login_data):
        """Успешное обновление access токена"""
        # Регистрируем и входим
        register_url = f"{base_url}{api_path}/register"
        requests.post(register_url, json=valid_user_data)

        login_url = f"{base_url}{api_path}/login"
        login_response = requests.post(login_url, json=login_data)
        refresh_token = login_response.json()["refresh_token"]

        # Обновляем токен
        refresh_url = f"{base_url}{api_path}/refresh"
        response = requests.post(refresh_url, json={"refresh_token": refresh_token})

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "expires_in" in data
        assert data["expires_in"] == 3600
        # Новый access токен должен отличаться от старого
        assert data["access_token"] != login_response.json()["access_token"]

    def test_refresh_invalid_token(self, base_url, api_path):
        """Обновление с невалидным токеном должно вернуть 401"""
        url = f"{base_url}{api_path}/refresh"
        response = requests.post(url, json={"refresh_token": "invalid_token"})

        assert response.status_code == 401
        data = response.json()
        assert "error" in data
        assert data["error"] == "unauthorized"

    def test_refresh_missing_token(self, base_url, api_path):
        """Обновление без токена должно вернуть 400"""
        url = f"{base_url}{api_path}/refresh"
        response = requests.post(url, json={})

        assert response.status_code == 400
        data = response.json()
        assert "error" in data

    def test_refresh_revoked_token(self, base_url, api_path, valid_user_data, login_data):
        """Обновление с отозванным токеном должно вернуть 401"""
        # Регистрируем и входим
        register_url = f"{base_url}{api_path}/register"
        requests.post(register_url, json=valid_user_data)

        login_url = f"{base_url}{api_path}/login"
        login_response = requests.post(login_url, json=login_data)
        refresh_token = login_response.json()["refresh_token"]
        access_token = login_response.json()["access_token"]

        # Выходим (отзываем токены)
        logout_url = f"{base_url}{api_path}/logout"
        requests.post(logout_url, headers={"Authorization": f"Bearer {access_token}"})

        # Пытаемся обновить отозванный токен
        refresh_url = f"{base_url}{api_path}/refresh"
        response = requests.post(refresh_url, json={"refresh_token": refresh_token})

        assert response.status_code == 401
        data = response.json()
        assert "error" in data


class TestLogout:
    """Тесты для POST /api/v1/auth/logout"""

    def test_logout_success(self, base_url, api_path, valid_user_data, login_data):
        """Успешный выход из системы"""
        # Регистрируем и входим
        register_url = f"{base_url}{api_path}/register"
        requests.post(register_url, json=valid_user_data)

        login_url = f"{base_url}{api_path}/login"
        login_response = requests.post(login_url, json=login_data)
        access_token = login_response.json()["access_token"]

        # Выходим
        logout_url = f"{base_url}{api_path}/logout"
        response = requests.post(
            logout_url,
            headers={"Authorization": f"Bearer {access_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Logged out successfully"

    def test_logout_without_token(self, base_url, api_path):
        """Выход без токена должен вернуть 401"""
        url = f"{base_url}{api_path}/logout"
        response = requests.post(url)

        assert response.status_code == 401
        data = response.json()
        assert "error" in data
        assert data["error"] == "unauthorized"

    def test_logout_invalid_token(self, base_url, api_path):
        """Выход с невалидным токеном должен вернуть 401"""
        url = f"{base_url}{api_path}/logout"
        response = requests.post(
            url,
            headers={"Authorization": "Bearer invalid_token"}
        )

        assert response.status_code == 401
        data = response.json()
        assert "error" in data


class TestAdminLogin:
    """Тесты для POST /api/v1/auth/admin/login"""

    def test_admin_login_success(self, base_url, api_path, valid_admin_data, admin_login_data):
        """Успешный вход администратора"""
        # Сначала регистрируем администратора
        register_url = f"{base_url}{api_path}/admin/register"
        requests.post(register_url, json=valid_admin_data)

        # Выполняем вход
        login_url = f"{base_url}{api_path}/admin/login"
        response = requests.post(login_url, json=admin_login_data)

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "expires_in" in data
        assert data["expires_in"] == 3600
        assert "admin" in data
        assert data["admin"]["login"] == admin_login_data["login"]
        assert data["admin"]["id"] > 0

    def test_admin_login_invalid_credentials(self, base_url, api_path):
        """Вход администратора с неверными учетными данными должен вернуть 401"""
        url = f"{base_url}{api_path}/admin/login"
        response = requests.post(url, json={
            "login": "nonexistent@example.com",
            "password": "WrongPassword123"
        })

        assert response.status_code == 401
        data = response.json()
        assert "error" in data
        assert data["error"] == "unauthorized"

    def test_admin_login_wrong_password(self, base_url, api_path, valid_admin_data, admin_login_data):
        """Вход администратора с неверным паролем должен вернуть 401"""
        # Сначала регистрируем администратора
        register_url = f"{base_url}{api_path}/admin/register"
        requests.post(register_url, json=valid_admin_data)

        # Пытаемся войти с неверным паролем
        login_url = f"{base_url}{api_path}/admin/login"
        wrong_login_data = admin_login_data.copy()
        wrong_login_data["password"] = "WrongPassword123"
        response = requests.post(login_url, json=wrong_login_data)

        assert response.status_code == 401
        data = response.json()
        assert "error" in data
        assert data["error"] == "unauthorized"

    def test_admin_login_missing_fields(self, base_url, api_path):
        """Вход администратора без обязательных полей должен вернуть 400"""
        url = f"{base_url}{api_path}/admin/login"
        response = requests.post(url, json={})

        assert response.status_code == 400
        data = response.json()
        assert "error" in data


class TestAdminRegister:
    """Тесты для POST /api/v1/auth/admin/register"""

    def test_admin_register_success(self, base_url, api_path, valid_admin_data):
        """Успешная регистрация администратора"""
        url = f"{base_url}{api_path}/admin/register"
        response = requests.post(url, json=valid_admin_data)

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["login"] == valid_admin_data["login"]
        assert data["message"] == "Administrator created successfully"
        assert isinstance(data["id"], int)
        assert data["id"] > 0

    def test_admin_register_duplicate_login(self, base_url, api_path, valid_admin_data):
        """Регистрация администратора с уже существующим login должна вернуть 409"""
        # Сначала регистрируем администратора
        url = f"{base_url}{api_path}/admin/register"
        first_response = requests.post(url, json=valid_admin_data)
        assert first_response.status_code == 201  # Убеждаемся, что первая регистрация успешна

        # Пытаемся зарегистрировать с тем же login
        response = requests.post(url, json=valid_admin_data)

        assert response.status_code == 409
        data = response.json()
        assert "error" in data
        assert data["error"] == "conflict"

    def test_admin_register_invalid_password_too_short(self, base_url, api_path, unique_timestamp):
        """Регистрация администратора с паролем менее 8 символов должна вернуть 400"""
        invalid_data = {
            "login": f"admin{unique_timestamp}@example.com",
            "password": "short"
        }
        url = f"{base_url}{api_path}/admin/register"
        response = requests.post(url, json=invalid_data)

        assert response.status_code == 400
        data = response.json()
        assert "error" in data

    def test_admin_register_missing_fields(self, base_url, api_path):
        """Регистрация администратора без обязательных полей должна вернуть 400"""
        url = f"{base_url}{api_path}/admin/register"
        response = requests.post(url, json={})

        assert response.status_code == 400
        data = response.json()
        assert "error" in data


class TestValidateToken:
    """Тесты для POST /api/v1/auth/validate"""

    def test_validate_success(self, base_url, api_path, valid_user_data, login_data):
        """Успешная валидация токена"""
        # Регистрируем и входим
        register_url = f"{base_url}{api_path}/register"
        requests.post(register_url, json=valid_user_data)

        login_url = f"{base_url}{api_path}/login"
        login_response = requests.post(login_url, json=login_data)
        access_token = login_response.json()["access_token"]

        # Валидируем токен
        validate_url = f"{base_url}{api_path}/validate"
        response = requests.post(
            validate_url,
            headers={"Authorization": f"Bearer {access_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert "user_id" in data
        assert data["user_id"] > 0
        assert data["role"] == "user"
        assert "expires_at" in data

    def test_validate_admin_token(self, base_url, api_path, valid_admin_data, admin_login_data):
        """Валидация токена администратора"""
        # Регистрируем и входим как администратор
        register_url = f"{base_url}{api_path}/admin/register"
        requests.post(register_url, json=valid_admin_data)

        login_url = f"{base_url}{api_path}/admin/login"
        login_response = requests.post(login_url, json=admin_login_data)
        access_token = login_response.json()["access_token"]

        # Валидируем токен
        validate_url = f"{base_url}{api_path}/validate"
        response = requests.post(
            validate_url,
            headers={"Authorization": f"Bearer {access_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["role"] == "admin"

    def test_validate_without_token(self, base_url, api_path):
        """Валидация без токена должна вернуть 401"""
        url = f"{base_url}{api_path}/validate"
        response = requests.post(url)

        assert response.status_code == 401
        data = response.json()
        assert data["valid"] is False
        assert "error" in data

    def test_validate_invalid_token(self, base_url, api_path):
        """Валидация невалидного токена должна вернуть 401"""
        url = f"{base_url}{api_path}/validate"
        response = requests.post(
            url,
            headers={"Authorization": "Bearer invalid_token"}
        )

        assert response.status_code == 401
        data = response.json()
        assert data["valid"] is False
        assert "error" in data

    def test_validate_refresh_token_rejected(self, base_url, api_path, valid_user_data, login_data):
        """Валидация refresh токена должна быть отклонена"""
        # Регистрируем и входим
        register_url = f"{base_url}{api_path}/register"
        requests.post(register_url, json=valid_user_data)

        login_url = f"{base_url}{api_path}/login"
        login_response = requests.post(login_url, json=login_data)
        refresh_token = login_response.json()["refresh_token"]

        # Пытаемся валидировать refresh токен (должно быть отклонено)
        validate_url = f"{base_url}{api_path}/validate"
        response = requests.post(
            validate_url,
            headers={"Authorization": f"Bearer {refresh_token}"}
        )

        assert response.status_code == 401
        data = response.json()
        assert data["valid"] is False
        assert "error" in data

