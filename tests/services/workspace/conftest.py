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
    db_cursor.execute('DELETE FROM "userInWorkspace"')
    db_cursor.execute('DELETE FROM workspaces')


@pytest.fixture
def admin_token(auth_service_url, auth_api_path, unique_timestamp, db_cursor):
    """Получить токен администратора"""
    # Создаем администратора
    admin_data = {
        "login": f"admin{unique_timestamp}@example.com",
        "password": "AdminPassword123"
    }
    
    # Регистрируем администратора
    register_url = f"{auth_service_url}{auth_api_path}/register/admin"
    requests.post(register_url, json=admin_data)
    
    # Входим
    login_url = f"{auth_service_url}{auth_api_path}/login/admin"
    login_response = requests.post(login_url, json=admin_data)
    
    return login_response.json()["access_token"]


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
def tariff_id(db_cursor):
    """Создать тестовый тариф и вернуть его ID"""
    db_cursor.execute(
        "INSERT INTO tariffs (name, description) VALUES ('Test Tariff', 'Test Description') RETURNING id"
    )
    return db_cursor.fetchone()['id']


@pytest.fixture
def workspace_data(tariff_id, user_token):
    """Данные для создания рабочего пространства"""
    return {
        "name": f"Test Workspace {user_token['user_id']}",
        "tariff_id": tariff_id,
        "leader_id": user_token['user_id']
    }
