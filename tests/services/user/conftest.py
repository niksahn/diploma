"""
Фикстуры для тестов User Service
"""
import pytest
import os
import psycopg2
import requests
from psycopg2.extras import RealDictCursor

# URL сервисов
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://localhost:8082")
USER_API_PATH = "/api/v1/users"

# Настройки БД
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "messenger_db")
DB_USER = os.getenv("DB_USER", "user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")

# Константы ролей (дублируем из корневого conftest.py для локального использования)
ROLE_USER = "user"
TEST_USER_ID = 1


@pytest.fixture(scope="session")
def user_service_url():
    """Базовый URL для User Service"""
    return USER_SERVICE_URL


@pytest.fixture(scope="session")
def user_api_path():
    """Базовый путь API User Service"""
    return USER_API_PATH


@pytest.fixture(scope="session")
def db_connection():
    """Соединение с базой данных"""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        conn.autocommit = True
        yield conn
        conn.close()
    except Exception as e:
        pytest.skip(f"Database connection failed: {e}")


@pytest.fixture
def db_cursor(db_connection):
    """Курсор БД"""
    cursor = db_connection.cursor(cursor_factory=RealDictCursor)
    yield cursor
    cursor.close()


# Фикстура clean_workspace_data удалена, поскольку тесты теперь не манипулируют данными БД


# Фикстуры test_user_id и user_auth_headers_with_id удалены,
# поскольку тесты workspace теперь используют фиксированные ID из подготовленных данных