"""
Фикстуры для тестов Chat Service
"""
import pytest
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import requests
import time
import json
import base64

# URL сервисов
CHAT_SERVICE_URL = os.getenv("CHAT_SERVICE_URL", "http://localhost:8084")
CHAT_API_PATH = "/api/v1/chats"
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8081")
AUTH_API_PATH = "/api/v1/auth"
WORKSPACE_SERVICE_URL = os.getenv("WORKSPACE_SERVICE_URL", "http://localhost:8083")
WORKSPACE_API_PATH = "/api/v1/workspaces"

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
def chat_service_url():
    """Базовый URL для Chat Service"""
    return CHAT_SERVICE_URL


@pytest.fixture(scope="session")
def chat_api_path():
    """Базовый путь API Chat Service"""
    return CHAT_API_PATH


@pytest.fixture(scope="session")
def auth_service_url():
    """Базовый URL для Auth Service"""
    return AUTH_SERVICE_URL


@pytest.fixture(scope="session")
def auth_api_path():
    """Базовый путь API Auth Service"""
    return AUTH_API_PATH


@pytest.fixture(scope="session")
def workspace_service_url():
    """Базовый URL для Workspace Service"""
    return WORKSPACE_SERVICE_URL


@pytest.fixture(scope="session")
def workspace_api_path():
    """Базовый путь API Workspace Service"""
    return WORKSPACE_API_PATH


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
def clean_chat_data():
    """
    Не удаляем данные: тестовые сущности создаются через ON CONFLICT / стабильные ID.
    Фикстура сохранена для совместимости.
    """
    yield


@pytest.fixture(scope="session")
def admin_token(db_connection):
    """Заглушечный токен администратора (чат сервис принимает guest)"""
    _ensure_user(db_connection, TEST_ADMIN_ID, "admin@test.local")
    _ensure_admin(db_connection, TEST_ADMIN_ID, "admin@test.local")
    return _make_stub_jwt(TEST_ADMIN_ID, role="admin")


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


def _ensure_user(conn, user_id, login):
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(
        """
        INSERT INTO users (id, login, password, status, surname, name)
        VALUES (%s, %s, 'stub', 0, 'Test', 'User')
        ON CONFLICT (id) DO UPDATE SET login = EXCLUDED.login
        RETURNING id
        """,
        (user_id, login),
    )
    row = cur.fetchone()
    cur.close()
    return row["id"]


def _ensure_admin(conn, admin_id, login):
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(
        """
        INSERT INTO administrators (id, login, password)
        VALUES (%s, %s, 'stub')
        ON CONFLICT (id) DO UPDATE SET login = EXCLUDED.login
        RETURNING id
        """,
        (admin_id, login),
    )
    row = cur.fetchone()
    cur.close()
    return row["id"]


@pytest.fixture(scope="session")
def multiple_users(db_connection):
    """
    Создает небольшое фиксированное число пользователей напрямую в БД.
    Ничего лишнего не трогаем, используем ON CONFLICT.
    """
    base_id = 100  # не пересекаемся с seed/user_id=1
    users = []
    for i in range(5):
        uid = base_id + i
        login = f"chat-user-{uid}@example.com"
        user_id = _ensure_user(db_connection, uid, login)
        token = _make_stub_jwt(user_id, role="user")
        users.append(
            {
                "token": token,
                "user_id": user_id,
                "login": login,
                "name": f"Name{i}",
                "surname": f"Surname{i}",
            }
        )
    return users


@pytest.fixture(scope="session")
def base_workspace(db_connection, multiple_users):
    """
    Создает одно рабочее пространство 'test' и администратора до запуска тестов.
    Ничего не удаляем после завершения, чтобы не было skip.
    """
    cursor = db_connection.cursor(cursor_factory=RealDictCursor)

    # Гарантируем наличие тарифa
    cursor.execute(
        "INSERT INTO tariffs (name, description) VALUES ('Test Tariff', 'Test Description') ON CONFLICT DO NOTHING RETURNING id"
    )
    tariff_row = cursor.fetchone()
    if not tariff_row:
        cursor.execute("SELECT id FROM tariffs WHERE name = 'Test Tariff'")
        tariff_id = cursor.fetchone()["id"]
    else:
        tariff_id = tariff_row["id"]

    # Администратор рабочей области (создаём напрямую, чтобы не зависеть от Auth)
    _ensure_user(db_connection, TEST_ADMIN_ID, "admin@test.local")
    _ensure_admin(db_connection, TEST_ADMIN_ID, "admin@test.local")

    # Рабочее пространство test
    cursor.execute(
        """
        INSERT INTO workspaces (name, creator, tariffsid)
        VALUES (%s, %s, %s)
        ON CONFLICT (name) DO NOTHING
        RETURNING id
        """,
        ("test", TEST_ADMIN_ID, tariff_id),
    )
    row = cursor.fetchone()
    if row:
        workspace_id = row["id"]
    else:
        cursor.execute("SELECT id FROM workspaces WHERE name = %s", ("test",))
        workspace_id = cursor.fetchone()["id"]

    # Добавляем пользователей-участников (из multiple_users) в РП
    for user in multiple_users:
        cursor.execute(
            'INSERT INTO "userinworkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW()) ON CONFLICT DO NOTHING',
            (user["user_id"], workspace_id, 1),
        )

    # Добавляем администратора в РП, чтобы тестовый создатель имел права
    cursor.execute(
        'INSERT INTO "userinworkspace" (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW()) ON CONFLICT DO NOTHING',
        (TEST_ADMIN_ID, workspace_id, 2),
    )

    cursor.close()
    return {
        "workspace_id": workspace_id,
        "members": multiple_users,
        "leader": {"user_id": TEST_ADMIN_ID, "token": _make_stub_jwt(TEST_ADMIN_ID, role="admin")},
    }


@pytest.fixture
def workspace_with_members(base_workspace):
    """Возвращает заранее созданное рабочее пространство 'test' с участниками."""
    return base_workspace


@pytest.fixture
def user_auth_headers():
    """Заголовки для аутентификации обычного пользователя"""
    token = _make_stub_jwt(TEST_USER_ID, role=ROLE_USER)
    return {
        "Authorization": f"Bearer {token}",
        "X-User-ID": str(TEST_USER_ID),
        "X-User-Role": ROLE_USER
    }


@pytest.fixture
def admin_auth_headers():
    """Заголовки для аутентификации администратора"""
    token = _make_stub_jwt(TEST_ADMIN_ID, role=ROLE_ADMIN)
    return {
        "Authorization": f"Bearer {token}",
        "X-User-ID": str(TEST_ADMIN_ID),
        "X-User-Role": ROLE_ADMIN
    }


@pytest.fixture
def auth_headers_factory():
    """Фабрика для создания заголовков с любым user_id и role"""
    def _create_headers(user_id: int, role: str):
        token = _make_stub_jwt(user_id, role=role)
        return {
            "Authorization": f"Bearer {token}",
            "X-User-ID": str(user_id),
            "X-User-Role": role
        }
    return _create_headers


def _make_stub_jwt(user_id: int, role: str = "user") -> str:
    """
    Создает простой неподписанный JWT с user_id для тестов.
    Chat Service читает только payload, поэтому подпись может быть заглушкой.
    """
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"user_id": user_id, "role": role}

    def _b64(data: dict) -> str:
        return base64.urlsafe_b64encode(json.dumps(data).encode()).decode().rstrip("=")

    return f"{_b64(header)}.{_b64(payload)}.stub"

