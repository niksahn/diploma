"""
Фикстуры и вспомогательные функции для сценарных тестов API Gateway.
Используем только публичные маршруты Gateway (см. server/plans/api/gateway.md).
"""
import os
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


TEST_ADMIN_LOGIN = "gw-admin@example.com"
TEST_USER_LOGIN_TEMPLATE = "gw-user-{idx}@example.com"
TEST_TARIFF_NAME_TEMPLATE = "GW Test Tariff {label}"


@pytest.fixture(scope="session")
def unique_suffix():
    """
    Детеминированный суффикс, чтобы тестовые данные создавались одинаково.
    Конфликты решаем через login-then-login (409 => login).
    """
    return 42


@pytest.fixture(scope="session")
def db_connection():
    """Подключение к БД для точечных upsert'ов тестовых сущностей."""
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


@pytest.fixture
def auth_header():
    """Фабрика заголовков Authorization."""
    def _build(token: str):
        return {"Authorization": f"Bearer {token}"}
    return _build


def _register_or_login(base_url: str, path: str, login: str, password: str, payload: dict):
    """Регистрирует пользователя/админа, на 409 делает login, чтобы не трогать существующие данные."""
    register_resp = requests.post(f"{base_url}{path}/register", json=payload)
    if register_resp.status_code not in (200, 201, 409):
        pytest.fail(f"register failed: {register_resp.status_code} {register_resp.text}")

    login_resp = requests.post(
        f"{base_url}{path}/login",
        json={"login": login, "password": password},
    )
    assert login_resp.status_code == 200, login_resp.text
    return login_resp.json()


@pytest.fixture
def create_user(gateway_url, auth_api_path):
    """Зарегистрировать/залогинить пользователя через Gateway с детерминированными логинами."""
    def _create(index: int = 0):
        login = TEST_USER_LOGIN_TEMPLATE.format(idx=index)
        password = "UserPassword123"
        body = _register_or_login(
            gateway_url,
            auth_api_path,
            login,
            password,
            {
                "login": login,
                "password": password,
                "surname": "Tester",
                "name": "User",
                "patronymic": "Gateway",
            },
        )
        return {
            "id": body["user"]["id"],
            "login": login,
            "password": password,
            "access_token": body["access_token"],
            "refresh_token": body.get("refresh_token"),
        }
    return _create


@pytest.fixture
def create_admin(gateway_url, auth_api_path):
    """Зарегистрировать/залогинить администратора через Gateway с фиксированным логином."""
    def _create(index: int = 0):
        login = TEST_ADMIN_LOGIN if index == 0 else f"{TEST_ADMIN_LOGIN}.{index}"
        password = "AdminSecurePassword123"
        body = _register_or_login(
            gateway_url,
            f"{auth_api_path}/admin",
            login,
            password,
            {"login": login, "password": password},
        )
        return {
            "id": body["admin"]["id"],
            "login": login,
            "password": password,
            "access_token": body["access_token"],
        }
    return _create


@pytest.fixture
def create_tariff(db_cursor):
    """Создать/обновить тариф напрямую в БД (ON CONFLICT), вернуть ID."""
    def _create(admin_token: str, label: str):
        name = TEST_TARIFF_NAME_TEMPLATE.format(label=label)
        db_cursor.execute(
            """
            INSERT INTO tariffs (name, description)
            VALUES (%s, %s)
            ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
            RETURNING id
            """,
            (name, f"{label} description"),
        )
        row = db_cursor.fetchone()
        if not row:
            db_cursor.execute("SELECT id FROM tariffs WHERE name = %s", (name,))
            row = db_cursor.fetchone()
        return row["id"]
    return _create


@pytest.fixture
def create_workspace(gateway_url, workspace_api_path, auth_header, db_cursor):
    """Создать РП через API, при 409 получить id из БД, чтобы не трогать другие записи."""
    def _create(admin_token: str, name: str, tariff_id: int, leader_id: int):
        resp = requests.post(
            f"{gateway_url}{workspace_api_path}",
            json={"name": name, "tariff_id": tariff_id, "leader_id": leader_id},
            headers=auth_header(admin_token),
        )
        if resp.status_code == 201:
            return resp.json()["id"]
        if resp.status_code == 409:
            db_cursor.execute("SELECT id FROM workspaces WHERE name = %s", (name,))
            row = db_cursor.fetchone()
            assert row, "workspace conflict but no existing row"
            return row["id"]
        pytest.fail(f"create_workspace failed: {resp.status_code} {resp.text}")
    return _create


@pytest.fixture
def add_member(gateway_url, workspace_api_path, auth_header):
    """Добавить пользователя в РП указанным токеном, 409 трактуем как уже добавлен."""
    def _add(workspace_id: int, user_id: int, role: int, token: str):
        resp = requests.post(
            f"{gateway_url}{workspace_api_path}/{workspace_id}/members",
            json={"user_id": user_id, "role": role},
            headers=auth_header(token),
        )
        if resp.status_code == 201:
            return resp.json()
        if resp.status_code == 409:
            return {"user_id": user_id, "workspace_id": workspace_id, "role": role}
        pytest.fail(f"add_member failed: {resp.status_code} {resp.text}")
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

