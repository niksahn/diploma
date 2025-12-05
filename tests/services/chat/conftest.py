"""
Фикстуры для тестов Chat Service
"""
import pytest
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import requests
import time

# URL сервисов (через Kong Gateway для основных запросов)
CHAT_SERVICE_URL = os.getenv("CHAT_SERVICE_URL", "http://localhost:8080")
CHAT_API_PATH = "/api/v1/chats"
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8080")
AUTH_API_PATH = "/api/v1/auth"
WORKSPACE_SERVICE_URL = os.getenv("WORKSPACE_SERVICE_URL", "http://localhost:8080")
WORKSPACE_API_PATH = "/api/v1/workspaces"

# Прямые URL для обхода rate limiting в тестах
AUTH_SERVICE_DIRECT_URL = os.getenv("AUTH_SERVICE_DIRECT_URL", "http://localhost:8081")
WORKSPACE_SERVICE_DIRECT_URL = os.getenv("WORKSPACE_SERVICE_DIRECT_URL", "http://localhost:8083")

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
def clean_chat_data(db_cursor):
    """Очистка данных чатов после теста"""
    yield
    # Очищаем таблицы, связанные с чатами
    # Порядок важен из-за внешних ключей
    db_cursor.execute('DELETE FROM taskinchat')
    db_cursor.execute('DELETE FROM messages')
    db_cursor.execute('DELETE FROM userinchat')
    db_cursor.execute('DELETE FROM chats')


@pytest.fixture
def admin_token(auth_service_url, auth_api_path, unique_timestamp):
    """Получить токен администратора"""
    # Создаем администратора напрямую
    admin_data = {
        "login": f"admin{unique_timestamp}@example.com",
        "password": "AdminPassword123"
    }

    # Регистрируем администратора напрямую
    register_url = f"{AUTH_SERVICE_DIRECT_URL}{auth_api_path}/admin/register"
    requests.post(register_url, json=admin_data)

    # Логиним администратора через Kong (для получения валидного токена)
    login_url = f"{auth_service_url}{auth_api_path}/admin/login"
    login_response = requests.post(login_url, json=admin_data)

    login_data = login_response.json()
    if "access_token" not in login_data:
        raise Exception(f"Admin login failed: {login_response.status_code} {login_response.text}")

    return login_data["access_token"]


@pytest.fixture
def user_token(auth_service_url, auth_api_path, unique_timestamp):
    """Получить токен обычного пользователя"""
    # Создаем пользователя (прямой доступ к auth service для обхода rate limiting)
    user_data = {
        "login": f"user{unique_timestamp}@example.com",
        "password": "UserPassword123",
        "surname": "Ivanov",
        "name": "Ivan",
        "patronymic": "Ivanovich"
    }

    # Регистрируем и логиним пользователя напрямую (полный обход Kong для тестов)
    register_url = f"{AUTH_SERVICE_DIRECT_URL}{auth_api_path}/register"
    requests.post(register_url, json=user_data)

    login_url = f"{AUTH_SERVICE_DIRECT_URL}{auth_api_path}/login"
    login_response = requests.post(login_url, json=user_data)

    login_data = login_response.json()
    if "access_token" not in login_data:
        raise Exception(f"User login failed: {login_response.status_code} {login_response.text}")

    return {
        "token": login_data["access_token"],
        "user_id": login_data["user"]["id"]
    }


@pytest.fixture
def multiple_users(auth_service_url, auth_api_path, unique_timestamp):
    """Создать несколько пользователей и вернуть их токены"""
    users = []
    for i in range(5):
        user_data = {
            "login": f"user{i}_{unique_timestamp}@example.com",
            "password": "UserPassword123",
            "surname": f"Surname{i}",
            "name": f"Name{i}",
        }

        # Регистрируем и логиним пользователя напрямую (полный обход Kong для тестов)
        register_url = f"{AUTH_SERVICE_DIRECT_URL}{auth_api_path}/register"
        requests.post(register_url, json=user_data)

        login_url = f"{AUTH_SERVICE_DIRECT_URL}{auth_api_path}/login"
        login_response = requests.post(login_url, json=user_data)

        login_data = login_response.json()
        if "access_token" not in login_data:
            raise Exception(f"Login failed for {user_data['login']}: {login_response.status_code} {login_response.text}")

        users.append({
            "token": login_data["access_token"],
            "user_id": login_data["user"]["id"],
            "login": user_data["login"],
            "name": user_data["name"],
            "surname": user_data["surname"]
        })

        # Небольшая задержка между запросами
        import time
        time.sleep(0.1)

    return users


@pytest.fixture
def workspace_with_members(admin_token, multiple_users, workspace_service_url, workspace_api_path, db_cursor, clean_chat_data):
    """Создать рабочее пространство с участниками"""
    # Получаем ID администратора из токена напрямую
    import jwt
    try:
        decoded = jwt.decode(admin_token, options={"verify_signature": False})
        admin_id = decoded['user_id']
    except:
        # Если токен не декодируется, используем фиксированный ID последнего созданного админа
        db_cursor.execute("SELECT id FROM administrators ORDER BY id DESC LIMIT 1")
        admin_id = db_cursor.fetchone()['id']

    # Создаем тариф
    db_cursor.execute(
        "INSERT INTO tariffs (name, description) VALUES ('Test Tariff', 'Test Description') ON CONFLICT DO NOTHING RETURNING id"
    )
    tariff_id_row = db_cursor.fetchone()
    if not tariff_id_row:
        db_cursor.execute("SELECT id FROM tariffs WHERE name = 'Test Tariff'")
        tariff_id = db_cursor.fetchone()['id']
    else:
        tariff_id = tariff_id_row['id']

    # Создаем рабочее пространство напрямую в БД (для надежности тестов)
    workspace_name = f"Test Workspace {int(time.time())}"
    db_cursor.execute(
        "INSERT INTO workspaces (creator, tariffsid, name) VALUES (%s, %s, %s) RETURNING id",
        (admin_id, tariff_id, workspace_name)
    )
    workspace_id = db_cursor.fetchone()['id']

    # Добавляем всех пользователей в РП через БД (первый пользователь - лидер с ролью 2, остальные - участники с ролью 1)
    db_cursor.execute(
        'INSERT INTO userinworkspace (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
        (multiple_users[0]["user_id"], workspace_id, 2)  # лидер
    )

    for user in multiple_users[1:]:
        db_cursor.execute(
            'INSERT INTO userinworkspace (usersid, workspacesid, role, date) VALUES (%s, %s, %s, NOW())',
            (user["user_id"], workspace_id, 1)  # участник
        )

    return {
        "workspace_id": workspace_id,
        "members": multiple_users,
        "leader": multiple_users[0]
    }


@pytest.fixture
def user_auth_headers():
    """Заголовки для аутентификации обычного пользователя"""
    return {
        "X-User-ID": str(TEST_USER_ID),
        "X-User-Role": ROLE_USER
    }


@pytest.fixture
def admin_auth_headers():
    """Заголовки для аутентификации администратора"""
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

