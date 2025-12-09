"""
Общие фикстуры и настройки для тестов
"""
import pytest
import os
import time
from typing import Optional

# Базовый URL для Auth Service
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8081")
API_BASE_PATH = "/api/v1/auth"

# Константы ролей
ROLE_USER = "user"
ROLE_ADMIN = "admin"

# Константы для заголовков аутентификации (имитация API Gateway)
TEST_USER_ID = 1
TEST_ADMIN_ID = 1


@pytest.fixture(scope="session")
def base_url():
    """Базовый URL для Auth Service"""
    return AUTH_SERVICE_URL


@pytest.fixture(scope="session")
def api_path():
    """Базовый путь API"""
    return API_BASE_PATH


@pytest.fixture(scope="session")
def unique_timestamp():
    """Уникальный timestamp для генерации уникальных логинов"""
    return int(time.time() * 1000)  # миллисекунды для большей уникальности


@pytest.fixture
def valid_user_data(unique_timestamp):
    """Валидные данные для регистрации пользователя с уникальным login"""
    return {
        "login": f"testuser{unique_timestamp}@example.com",
        "password": "SecurePassword123",
        "surname": "Ivanov",
        "name": "Ivan",
        "patronymic": "Ivanovich"
    }


@pytest.fixture
def valid_admin_data(unique_timestamp):
    """Валидные данные для регистрации администратора с уникальным login"""
    return {
        "login": f"testadmin{unique_timestamp}@example.com",
        "password": "AdminSecurePassword123"
    }


@pytest.fixture
def login_data(valid_user_data):
    """Данные для входа пользователя (использует данные из valid_user_data)"""
    return {
        "login": valid_user_data["login"],
        "password": valid_user_data["password"]
    }


@pytest.fixture
def admin_login_data(valid_admin_data):
    """Данные для входа администратора (использует данные из valid_admin_data)"""
    return {
        "login": valid_admin_data["login"],
        "password": valid_admin_data["password"]
    }


@pytest.fixture
def user_auth_headers():
    """Заголовки для аутентификации обычного пользователя (имитация API Gateway)"""
    return {
        "X-User-ID": str(TEST_USER_ID),
        "X-User-Role": ROLE_USER
    }


@pytest.fixture
def admin_auth_headers():
    """Заголовки для аутентификации администратора (имитация API Gateway)"""
    return {
        "X-User-ID": str(TEST_ADMIN_ID),
        "X-User-Role": ROLE_ADMIN
    }


@pytest.fixture
def auth_headers_factory():
    """Фабрика для создания заголовков с любым user_id и role"""
    def _create_headers(user_id: int, role: str):
        return {
            "X-User-ID": str(user_id),
            "X-User-Role": role
        }
    return _create_headers

