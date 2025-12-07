"""
Фикстуры для тестов Workspace Service
"""
import pytest
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import requests

# URL сервисов
WORKSPACE_SERVICE_URL = os.getenv("WORKSPACE_SERVICE_URL", "http://localhost:8083")
WORKSPACE_API_PATH = "/api/v1/workspaces"
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8081")
AUTH_API_PATH = "/api/v1/auth"

# Настройки БД
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "messenger_db")
DB_USER = os.getenv("DB_USER", "user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")

# Константы ролей (дублируем из корневого conftest.py)
ROLE_USER = "user"
ROLE_ADMIN = "admin"
TEST_USER_ID = 1
TEST_ADMIN_ID = 1


@pytest.fixture(scope="session")
def workspace_service_url():
    """Базовый URL для Workspace Service"""
    return WORKSPACE_SERVICE_URL


@pytest.fixture(scope="session")
def workspace_api_path():
    """Базовый путь API Workspace Service"""
    return WORKSPACE_API_PATH


@pytest.fixture(scope="session")
def auth_service_url():
    """Базовый URL для Auth Service"""
    return AUTH_SERVICE_URL


@pytest.fixture(scope="session")
def auth_api_path():
    """Базовый путь API Auth Service"""
    return AUTH_API_PATH


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
    db_cursor.execute('DELETE FROM "userinworkspace"')
    db_cursor.execute('DELETE FROM workspaces')


@pytest.fixture
def admin_token(auth_service_url, auth_api_path, unique_timestamp):
    """Получить токен администратора"""
    admin_data = {
        "login": f"admin{unique_timestamp}@example.com",
        "password": "AdminPassword123"
    }
    # Регистрируем администратора
    register_url = f"{auth_service_url}{auth_api_path}/admin/register"
    requests.post(register_url, json=admin_data)
    # Входим
    login_url = f"{auth_service_url}{auth_api_path}/admin/login"
    login_response = requests.post(login_url, json=admin_data)
    body = login_response.json()
    return {
        "token": body["access_token"],
        "admin_id": body.get("admin", {}).get("id", TEST_ADMIN_ID)
    }


@pytest.fixture
def user_token(auth_service_url, auth_api_path, unique_timestamp):
    """Получить токен обычного пользователя"""
    # Создаем пользователя
    user_data = {
        "login": f"user{unique_timestamp}@example.com",
        "password": "UserPassword123",
        "surname": "Ivanov",
        "name": "Ivan",
        "patronymic": "Ivanovich"
    }
    
    # Регистрируем пользователя
    register_url = f"{auth_service_url}{auth_api_path}/register"
    requests.post(register_url, json=user_data)
    
    # Входим
    login_url = f"{auth_service_url}{auth_api_path}/login"
    login_response = requests.post(login_url, json=user_data)
    
    return {
        "token": login_response.json()["access_token"],
        "user_id": login_response.json()["user"]["id"]
    }


@pytest.fixture
def tariff_id(db_cursor, unique_timestamp):
    """Создать тестовый тариф и вернуть его ID (уникальные имя/описание, без конфликтов)"""
    name = f"Test Tariff {unique_timestamp}"
    desc = f"Test Description {unique_timestamp}"
    db_cursor.execute(
        """
        INSERT INTO tariffs (name, description)
        VALUES (%s, %s)
        ON CONFLICT (name) DO NOTHING
        RETURNING id
        """,
        (name, desc)
    )
    row = db_cursor.fetchone()
    if row and 'id' in row:
        return row['id']
    # если запись уже есть (по имени), выбираем существующую
    db_cursor.execute("SELECT id FROM tariffs WHERE name = %s", (name,))
    return db_cursor.fetchone()['id']


@pytest.fixture
def workspace_data(tariff_id, user_token):
    """Данные для создания рабочего пространства"""
    return {
        "name": f"Test Workspace {user_token['user_id']}",
        "tariff_id": tariff_id,
        "leader_id": user_token['user_id']
    }


@pytest.fixture
def user_auth_headers(user_token):
    """Заголовки для аутентификации обычного пользователя (совпадают с созданным юзером)"""
    return {
        "X-User-ID": str(user_token["user_id"]),
        "X-User-Role": ROLE_USER
    }


@pytest.fixture
def admin_auth_headers(admin_token):
    """Заголовки для аутентификации администратора"""
    return {
        "X-User-ID": str(admin_token["admin_id"]),
        "X-User-Role": ROLE_ADMIN
    }

@pytest.fixture
def leader_headers(user_token):
    """Заголовки для лидера РП (созданного пользователя)"""
    return {
        "X-User-ID": str(user_token["user_id"]),
        "X-User-Role": ROLE_USER
    }

@pytest.fixture
def another_user_token(auth_service_url, auth_api_path, unique_timestamp):
    """Второй пользователь для сценариев non-member"""
    user_data = {
        "login": f"other{unique_timestamp}@example.com",
        "password": "UserPassword123",
        "surname": "Smith",
        "name": "John",
        "patronymic": "P"
    }
    register_url = f"{auth_service_url}{auth_api_path}/register"
    requests.post(register_url, json=user_data)
    login_url = f"{auth_service_url}{auth_api_path}/login"
    login_response = requests.post(login_url, json=user_data)
    return {
        "token": login_response.json()["access_token"],
        "user_id": login_response.json()["user"]["id"]
    }

@pytest.fixture
def another_user_headers(another_user_token):
    return {
        "X-User-ID": str(another_user_token["user_id"]),
        "X-User-Role": ROLE_USER
    }
