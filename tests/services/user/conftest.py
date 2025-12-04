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


@pytest.fixture
def clean_workspace_data(db_cursor):
    """Очистка данных рабочих пространств после теста"""
    yield
    # Очищаем таблицы, связанные с workspaces
    # Порядок важен из-за внешних ключей
    db_cursor.execute('DELETE FROM "userInWorkspace"')
    db_cursor.execute('DELETE FROM workspaces')


@pytest.fixture
def test_user_id(db_cursor, valid_user_data, base_url, api_path):
    """Создает тестового пользователя и возвращает его ID"""
    # Регистрируем пользователя
    register_url = f"{base_url}{api_path}/register"
    requests.post(register_url, json=valid_user_data)

    # Получаем его ID из базы данных
    db_cursor.execute(
        "SELECT id FROM users WHERE login = %s",
        (valid_user_data["login"],)
    )
    result = db_cursor.fetchone()
    return result['id'] if result else TEST_USER_ID


@pytest.fixture
def user_auth_headers_with_id(test_user_id):
    """Заголовки аутентификации с реальным user_id"""
    return {
        "X-User-ID": str(test_user_id),
        "X-User-Role": ROLE_USER
    }