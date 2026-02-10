#!/usr/bin/env bash
# Заполнение тестовыми данными через API бекенда.
# Требования: curl, jq (brew install jq).
# Запуск: после старта сервисов (docker-compose up -d) выполнить:
#   ./scripts/seed_test_data.sh
# Либо: BASE_URL=http://localhost:8080 ./scripts/seed_test_data.sh

set -e
BASE_URL="${BASE_URL:-http://localhost:8080}"
API_AUTH="${BASE_URL}/api/v1/auth"
API_WS="${BASE_URL}/api/v1/workspaces"

# Логин/пароль: API требует пароль не менее 8 символов
USER_LOGIN="test"
USER_PASS="testtest"
ADMIN_LOGIN="admin"
ADMIN_PASS="adminadmin"

echo "=== Seed: $BASE_URL ==="

# 1) Регистрация администратора
echo "1. Регистрация администратора (admin / adminadmin)..."
ADMIN_REG=$(curl -s -w "\n%{http_code}" -X POST "$API_AUTH/admin/register" \
  -H "Content-Type: application/json" \
  -d "{\"login\":\"$ADMIN_LOGIN\",\"password\":\"$ADMIN_PASS\"}")
HTTP=$(echo "$ADMIN_REG" | tail -n1)
BODY=$(echo "$ADMIN_REG" | sed '$d')
if [ "$HTTP" = "201" ]; then
  echo "   Admin создан."
elif [ "$HTTP" = "409" ]; then
  echo "   Admin уже существует, пропуск."
else
  echo "   Ошибка $HTTP: $BODY"
  exit 1
fi

# 2) Регистрация пользователя test
echo "2. Регистрация пользователя (test / testtest)..."
USER_REG=$(curl -s -w "\n%{http_code}" -X POST "$API_AUTH/register" \
  -H "Content-Type: application/json" \
  -d "{\"login\":\"$USER_LOGIN\",\"password\":\"$USER_PASS\",\"surname\":\"Test\",\"name\":\"Test\",\"patronymic\":\"\"}")
HTTP=$(echo "$USER_REG" | tail -n1)
BODY=$(echo "$USER_REG" | sed '$d')
if [ "$HTTP" = "201" ]; then
  TEST_USER_ID=$(echo "$BODY" | jq -r '.id')
  echo "   User создан, id=$TEST_USER_ID"
elif [ "$HTTP" = "409" ]; then
  echo "   User уже существует, получаю id через логин..."
  LOGIN_RESP=$(curl -s -X POST "$API_AUTH/login" \
    -H "Content-Type: application/json" \
    -d "{\"login\":\"$USER_LOGIN\",\"password\":\"$USER_PASS\"}")
  TEST_USER_ID=$(echo "$LOGIN_RESP" | jq -r '.user.id')
  if [ "$TEST_USER_ID" = "null" ] || [ -z "$TEST_USER_ID" ]; then
    echo "   Не удалось получить id пользователя test. Ответ: $LOGIN_RESP"
    exit 1
  fi
  echo "   User id=$TEST_USER_ID"
else
  echo "   Ошибка $HTTP: $BODY"
  exit 1
fi

# 3) Вход под администратором
echo "3. Вход под администратором..."
ADMIN_LOGIN_RESP=$(curl -s -X POST "$API_AUTH/admin/login" \
  -H "Content-Type: application/json" \
  -d "{\"login\":\"$ADMIN_LOGIN\",\"password\":\"$ADMIN_PASS\"}")
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_RESP" | jq -r '.access_token')
if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo "   Ошибка входа admin: $ADMIN_LOGIN_RESP"
  exit 1
fi
echo "   Токен получен."

# 4) Тариф: получить или создать
echo "4. Тариф для workspace..."
TARIFFS=$(curl -s "$API_WS/tariffs")
TARIFF_ID=$(echo "$TARIFFS" | jq -r '.tariffs[0].id // empty')
if [ -z "$TARIFF_ID" ] || [ "$TARIFF_ID" = "null" ]; then
  TARIFF_CREATE=$(curl -s -w "\n%{http_code}" -X POST "$API_WS/tariffs" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Basic","description":"Basic plan for testing"}')
  HTTP_T=$(echo "$TARIFF_CREATE" | tail -n1)
  BODY_T=$(echo "$TARIFF_CREATE" | sed '$d')
  if [ "$HTTP_T" = "201" ]; then
    TARIFF_ID=$(echo "$BODY_T" | jq -r '.id')
    echo "   Тариф Basic создан, id=$TARIFF_ID"
  else
    echo "   Ошибка создания тарифа $HTTP_T: $BODY_T"
    exit 1
  fi
else
  echo "   Используется существующий тариф id=$TARIFF_ID"
fi

# 5) Создать workspace с руководителем test (он автоматически попадёт в РП)
echo "5. Создание рабочего пространства с руководителем test..."
WS_CREATE=$(curl -s -w "\n%{http_code}" -X POST "$API_WS" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Workspace\",\"tariff_id\":$TARIFF_ID,\"leader_id\":$TEST_USER_ID}")
HTTP_W=$(echo "$WS_CREATE" | tail -n1)
BODY_W=$(echo "$WS_CREATE" | sed '$d')
if [ "$HTTP_W" = "201" ]; then
  WS_ID=$(echo "$BODY_W" | jq -r '.id')
  echo "   Workspace создан, id=$WS_ID (руководитель: test)"
elif [ "$HTTP_W" = "409" ]; then
  echo "   Workspace с таким именем уже существует (test уже в каком-то РП)."
else
  echo "   Ошибка создания workspace $HTTP_W: $BODY_W"
  exit 1
fi

echo ""
echo "=== Готово. Данные для входа ==="
echo "  Пользователь:  логин: $USER_LOGIN   пароль: $USER_PASS"
echo "  Администратор: логин: $ADMIN_LOGIN  пароль: $ADMIN_PASS"
echo "  (Пароль не менее 8 символов по API, поэтому testtest / adminadmin.)"
echo ""
