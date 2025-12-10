"""
Фикстуры для тестов Complaint Service
"""
import os
import time
import pytest


COMPLAINT_SERVICE_URL = os.getenv("COMPLAINT_SERVICE_URL", "http://localhost:8086")
COMPLAINT_API_PATH = "/api/v1/complaints"

# Роли/ID для имитации Gateway
ROLE_USER = "user"
ROLE_ADMIN = "admin"
TEST_USER_ID = 2
TEST_ADMIN_ID = 1


@pytest.fixture(scope="session")
def complaint_service_url():
    """Базовый URL Complaint Service"""
    return COMPLAINT_SERVICE_URL


@pytest.fixture(scope="session")
def complaint_api_path():
    """Базовый путь Complaint Service"""
    return COMPLAINT_API_PATH


@pytest.fixture
def unique_suffix():
    """Уникальный суффикс для текста жалобы"""
    return int(time.time() * 1000)


@pytest.fixture
def valid_complaint_body(unique_suffix):
    """Валидное тело жалобы"""
    return {
        "text": f"Application crashes when uploading large files #{unique_suffix}",
        "device_description": "Windows 10, Chrome 120.0, 16GB RAM"
    }


@pytest.fixture
def user_headers():
    """Заголовки обычного пользователя"""
    return {
        "X-User-ID": str(TEST_USER_ID),
        "X-User-Role": ROLE_USER,
    }


@pytest.fixture
def admin_headers():
    """Заголовки администратора"""
    return {
        "X-User-ID": str(TEST_ADMIN_ID),
        "X-User-Role": ROLE_ADMIN,
    }


@pytest.fixture
def other_user_headers():
    """Заголовки другого пользователя"""
    return {
        "X-User-ID": str(TEST_USER_ID + 10),
        "X-User-Role": ROLE_USER,
    }






