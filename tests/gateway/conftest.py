"""
Фикстуры и вспомогательные функции для сценарных тестов API Gateway.
Используем только публичные маршруты Gateway (см. server/plans/api/gateway.md).
"""
import os
import time
import pytest
import requests
import psycopg2
from psycopg2.extras import RealDictCursor

# Базовые настройки
GATEWAY_URL = os.getenv("GATEWAY_URL", "http://localhost:8080")
AUTH_API_PATH = "/api/v1/auth"
GATEWAY_API_PATH = "/api/v1/gateway"
WORKSPACE_API_PATH = "/api/v1/workspaces"
CHAT_API_PATH = "/api/v1/chats"
TASK_API_PATH = "/api/v1/tasks"
COMPLAINT_API_PATH = "/api/v1/complaints"

# Настройки БД
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "messenger_db")
DB_USER = os.getenv("DB_USER", "user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")


@pytest.fixture(scope="session")
def gateway_url():
    return GATEWAY_URL


@pytest.fixture(scope="session")
def auth_api_path():
    return AUTH_API_PATH


@pytest.fixture(scope="session")
def gateway_api_path():
    return GATEWAY_API_PATH


@pytest.fixture(scope="session")
def workspace_api_path():
    return WORKSPACE_API_PATH


@pytest.fixture(scope="session")
def chat_api_path():
    return CHAT_API_PATH


@pytest.fixture(scope="session")
def task_api_path():
    return TASK_API_PATH


@pytest.fixture(scope="session")
def complaint_api_path():
    return COMPLAINT_API_PATH


@pytest.fixture
def unique_suffix():
    """Уникальный суффикс для логинов/имен внутри одного теста."""
    return int(time.time() * 1000)


@pytest.fixture(scope="session")
def db_connection():
    """Подключение к БД для очистки между сценариями."""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
        )
        conn.autocommit = True
        yield conn
        conn.close()
    except Exception as exc:
        pytest.skip(f"Database connection failed for gateway tests: {exc}")


@pytest.fixture
def db_cursor(db_connection):
    cursor = db_connection.cursor(cursor_factory=RealDictCursor)
    yield cursor
    cursor.close()


@pytest.fixture(autouse=True)
def cleanup_db(db_cursor):
    """
    Полная очистка данных после каждого теста.
    Порядок удаления важен из-за внешних ключей.
    """
    yield
    db_cursor.execute('DELETE FROM "taskinchat"')
    db_cursor.execute("DELETE FROM taskchanges")
    db_cursor.execute("DELETE FROM userintask")
    db_cursor.execute("DELETE FROM messages")
    db_cursor.execute('DELETE FROM "userinchat"')
    db_cursor.execute("DELETE FROM tasks")
    db_cursor.execute("DELETE FROM chats")
    db_cursor.execute('DELETE FROM "userinworkspace"')
    db_cursor.execute("DELETE FROM complaints")
    db_cursor.execute("DELETE FROM workspaces")
    db_cursor.execute("DELETE FROM tariffs")
    db_cursor.execute("DELETE FROM refresh_tokens")
    db_cursor.execute("DELETE FROM users")
    db_cursor.execute("DELETE FROM administrators")


@pytest.fixture
def auth_header():
    """Фабрика заголовков Authorization."""
    def _build(token: str):
        return {"Authorization": f"Bearer {token}"}
    return _build


@pytest.fixture
def create_user(gateway_url, auth_api_path, unique_suffix):
    """Зарегистрировать и залогинить пользователя через Gateway."""
    def _create(index: int = 0):
        login = f"user{unique_suffix}{index}@example.com"
        password = "UserPassword123"
        register_resp = requests.post(
            f"{gateway_url}{auth_api_path}/register",
            json={
                "login": login,
                "password": password,
                "surname": "Tester",
                "name": "User",
                "patronymic": "Gateway",
            },
        )
        assert register_resp.status_code == 201, register_resp.text

        login_resp = requests.post(
            f"{gateway_url}{auth_api_path}/login",
            json={"login": login, "password": password},
        )
        assert login_resp.status_code == 200, login_resp.text
        body = login_resp.json()
        return {
            "id": body["user"]["id"],
            "login": login,
            "password": password,
            "access_token": body["access_token"],
            "refresh_token": body.get("refresh_token"),
        }
    return _create


@pytest.fixture
def create_admin(gateway_url, auth_api_path, unique_suffix):
    """Зарегистрировать и залогинить администратора через Gateway."""
    def _create(index: int = 0):
        login = f"admin{unique_suffix}{index}@example.com"
        password = "AdminSecurePassword123"
        register_resp = requests.post(
            f"{gateway_url}{auth_api_path}/admin/register",
            json={"login": login, "password": password},
        )
        assert register_resp.status_code == 201, register_resp.text

        login_resp = requests.post(
            f"{gateway_url}{auth_api_path}/admin/login",
            json={"login": login, "password": password},
        )
        assert login_resp.status_code == 200, login_resp.text
        body = login_resp.json()
        return {
            "id": body["admin"]["id"],
            "login": login,
            "password": password,
            "access_token": body["access_token"],
        }
    return _create


@pytest.fixture
def create_tariff(gateway_url, workspace_api_path, auth_header, unique_suffix):
    """Создать тариф администратором и вернуть его ID."""
    def _create(admin_token: str, label: str):
        resp = requests.post(
            f"{gateway_url}{workspace_api_path}/tariffs",
            json={
                "name": f"{label} Tariff",
                "description": f"{label} description",
            },
            headers=auth_header(admin_token),
        )
        assert resp.status_code in (200, 201), resp.text
        body = resp.json()
        return body.get("id") or body.get("tariff_id") or body.get("tariffs_id")
    return _create


@pytest.fixture
def create_workspace(gateway_url, workspace_api_path, auth_header):
    """Создать рабочее пространство администратором."""
    def _create(admin_token: str, name: str, tariff_id: int, leader_id: int):
        resp = requests.post(
            f"{gateway_url}{workspace_api_path}",
            json={"name": name, "tariff_id": tariff_id, "leader_id": leader_id},
            headers=auth_header(admin_token),
        )
        assert resp.status_code == 201, resp.text
        return resp.json()["id"]
    return _create


@pytest.fixture
def add_member(gateway_url, workspace_api_path, auth_header):
    """Добавить пользователя в РП указанным токеном."""
    def _add(workspace_id: int, user_id: int, role: int, token: str):
        resp = requests.post(
            f"{gateway_url}{workspace_api_path}/{workspace_id}/members",
            json={"user_id": user_id, "role": role},
            headers=auth_header(token),
        )
        assert resp.status_code == 201, resp.text
        return resp.json()
    return _add


@pytest.fixture
def create_chat(gateway_url, chat_api_path, auth_header):
    """Создать чат в РП."""
    def _create(token: str, name: str, workspace_id: int, member_ids):
        resp = requests.post(
            f"{gateway_url}{chat_api_path}",
            json={
                "name": name,
                "type": 2,
                "workspace_id": workspace_id,
                "members": member_ids,
            },
            headers=auth_header(token),
        )
        assert resp.status_code == 201, resp.text
        return resp.json()["id"]
    return _create

