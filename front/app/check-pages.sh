#!/bin/bash
echo "=== Проверка страниц приложения ==="
echo ""
echo "1. Главная страница (/):"
curl -s -o /dev/null -w "  Статус: %{http_code}\n" http://localhost:5174/
echo ""
echo "2. Страница авторизации (/auth):"
curl -s -o /dev/null -w "  Статус: %{http_code}\n" http://localhost:5174/auth
echo ""
echo "3. Страница рабочих пространств (/workspaces):"
curl -s -o /dev/null -w "  Статус: %{http_code}\n" http://localhost:5174/workspaces
echo ""
echo "4. Страница чатов (/chats):"
curl -s -o /dev/null -w "  Статус: %{http_code}\n" http://localhost:5174/chats
echo ""
echo "5. Страница задач (/tasks):"
curl -s -o /dev/null -w "  Статус: %{http_code}\n" http://localhost:5174/tasks
echo ""
echo "6. Страница участников (/members):"
curl -s -o /dev/null -w "  Статус: %{http_code}\n" http://localhost:5174/members
echo ""
echo "7. Страница жалоб (/complaints):"
curl -s -o /dev/null -w "  Статус: %{http_code}\n" http://localhost:5174/complaints
echo ""
echo "8. Страница профиля (/profile):"
curl -s -o /dev/null -w "  Статус: %{http_code}\n" http://localhost:5174/profile
echo ""
echo "9. Страница 404:"
curl -s -o /dev/null -w "  Статус: %{http_code}\n" http://localhost:5174/404-test
echo ""
echo "=== Проверка завершена ==="
