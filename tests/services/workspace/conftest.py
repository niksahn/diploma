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

# Настройки БД (по умолчанию совпадают с workspace service)
DB_HOST = os.getenv("DB_HOST", "postgres")
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


@pytest.fixture(scope="session", autouse=True)
def seed_base_user(db_connection):
    """Создает базового пользователя с id=1 для внешних ключей."""
    _ensure_user(
        db_connection,
        login="seed-user@example.com",
        surname="Seed",
        name="User",
        patronymic="Seedovich",
        user_id=TEST_USER_ID,
    )


def _ensure_user(conn, login, surname="Test", name="User", patronymic="T", user_id=None):
    """Гарантирует наличие пользователя в таблице users и возвращает его id."""
    cur = conn.cursor(cursor_factory=RealDictCursor)
    if user_id is not None:
        cur.execute(
            """
            INSERT INTO users (id, login, password, status, surname, name, patronymic)
            VALUES (%s, %s, 'password', 0, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET login = EXCLUDED.login
            RETURNING id
            """,
            (user_id, login, surname, name, patronymic),
        )
    else:
        cur.execute(
            """
            INSERT INTO users (login, password, status, surname, name, patronymic)
            VALUES (%s, 'password', 0, %s, %s, %s)
            ON CONFLICT (login) DO UPDATE SET surname = EXCLUDED.surname
            RETURNING id
            """,
            (login, surname, name, patronymic),
        )
    row = cur.fetchone()
    if not row:
        cur.execute("SELECT id FROM users WHERE login = %s", (login,))
        row = cur.fetchone()
    cur.close()
    return row["id"]


def _safe_post(url, payload):
    """Отправляет POST и возвращает ответ или None при ошибке"""
    try:
        resp = requests.post(url, json=payload, timeout=5)
        if resp.ok:
            return resp
    except Exception:
        return None
    return resp


@pytest.fixture
def clean_workspace_data():
    """
    Ничего не удаляем: тестовые данные создаются идемпотентно через ON CONFLICT.
    Оставлено для совместимости с существующими тестами.
    """
    yield


@pytest.fixture
def admin_token(auth_service_url, auth_api_path, unique_timestamp, db_connection):
    """Получить токен администратора. При недоступности Auth возвращаем заглушку."""
    admin_data = {
        "login": f"admin{unique_timestamp}@example.com",
        "password": "AdminPassword123",
    }

    register_url = f"{auth_service_url}{auth_api_path}/admin/register"
    login_url = f"{auth_service_url}{auth_api_path}/admin/login"

    login_response = None
    _safe_post(register_url, admin_data)
    login_response = _safe_post(login_url, admin_data)

    if login_response:
        try:
            body = login_response.json()
            if "access_token" in body:
                return {
                    "token": body["access_token"],
                    "admin_id": body.get("admin", {}).get("id", TEST_ADMIN_ID),
                }
        except Exception:
            pass

    # Fallback: создаем администратора напрямую в БД
    admin_id = _ensure_user(
        db_connection,
        login=admin_data["login"],
        surname="Admin",
        name="Admin",
        patronymic="Adminovich",
        user_id=TEST_ADMIN_ID,
    )
    return {"token": "stub-admin-token", "admin_id": admin_id}


@pytest.fixture
def user_token(auth_service_url, auth_api_path, unique_timestamp, db_connection):
    """Получить токен обычного пользователя или заглушку при офлайне Auth."""
    user_data = {
        "login": f"user{unique_timestamp}@example.com",
        "password": "UserPassword123",
        "surname": "Ivanov",
        "name": "Ivan",
        "patronymic": "Ivanovich",
    }

    register_url = f"{auth_service_url}{auth_api_path}/register"
    login_url = f"{auth_service_url}{auth_api_path}/login"

    _safe_post(register_url, user_data)
    login_response = _safe_post(login_url, user_data)

    if login_response:
        try:
            body = login_response.json()
            if "access_token" in body:
                return {
                    "token": body["access_token"],
                    "user_id": body["user"]["id"],
                }
        except Exception:
            pass

    # Fallback: создаем пользователя в БД
    user_id = _ensure_user(
        db_connection,
        login=user_data["login"],
        surname=user_data["surname"],
        name=user_data["name"],
        patronymic=user_data["patronymic"],
    )
    return {"token": "stub-user-token", "user_id": user_id}


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
def another_user_token(auth_service_url, auth_api_path, unique_timestamp, db_connection):
    """Второй пользователь для сценариев non-member"""
    user_data = {
        "login": f"other{unique_timestamp}@example.com",
        "password": "UserPassword123",
        "surname": "Smith",
        "name": "John",
        "patronymic": "P",
    }
    register_url = f"{auth_service_url}{auth_api_path}/register"
    login_url = f"{auth_service_url}{auth_api_path}/login"

    _safe_post(register_url, user_data)
    login_response = _safe_post(login_url, user_data)

    if login_response:
        try:
            body = login_response.json()
            if "access_token" in body:
                return {
                    "token": body["access_token"],
                    "user_id": body["user"]["id"],
                }
        except Exception:
            pass

    user_id = _ensure_user(
        db_connection,
        login=user_data["login"],
        surname=user_data["surname"],
        name=user_data["name"],
        patronymic=user_data["patronymic"],
    )
    return {"token": "stub-user-token", "user_id": user_id}

@pytest.fixture
def another_user_headers(another_user_token):
    return {
        "X-User-ID": str(another_user_token["user_id"]),
        "X-User-Role": ROLE_USER
    }
