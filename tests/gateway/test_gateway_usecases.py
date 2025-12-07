"""
Сценарные тесты API Gateway, покрывающие ключевые варианты использования
из диаграммы `usecase_messendger`:
- аутентификация пользователя;
- выбор и работа в рабочем пространстве;
- управление чатами и обмен сообщениями;
- создание и сопровождение задач;
- отправка пользовательской жалобы.
Маршруты описаны в `server/plans/api/gateway.md`, схемы — в `server/src/swagger-docs`.
"""
import requests


def test_user_auth_flow_via_gateway(
    gateway_url,
    auth_api_path,
    gateway_api_path,
    create_user,
    auth_header,
):
    """
    Пользователь регистрируется, логинится, обновляет токен и запрашивает агрегированный профиль.
    """
    user = create_user()

    refresh_resp = requests.post(
        f"{gateway_url}{auth_api_path}/refresh",
        json={"refresh_token": user["refresh_token"]},
    )
    assert refresh_resp.status_code == 200
    new_access = refresh_resp.json()["access_token"]

    me_resp = requests.get(
        f"{gateway_url}{gateway_api_path}/me",
        headers=auth_header(new_access),
    )
    assert me_resp.status_code == 200
    me_body = me_resp.json()
    assert me_body["user"]["login"] == user["login"]
    assert "workspaces" in me_body

    logout_resp = requests.post(
        f"{gateway_url}{auth_api_path}/logout",
        headers=auth_header(new_access),
    )
    assert logout_resp.status_code == 200


def test_workspace_chat_message_flow(
    gateway_url,
    workspace_api_path,
    chat_api_path,
    unique_suffix,
    create_admin,
    create_user,
    create_tariff,
    create_workspace,
    add_member,
    create_chat,
    auth_header,
):
    """
    Руководитель РП создает рабочее пространство, приглашает участника,
    участник выбирает РП, создается чат и отправляется сообщение.
    """
    admin = create_admin()
    leader = create_user(index=1)
    member = create_user(index=2)

    tariff_id = create_tariff(admin["access_token"], f"GW-{unique_suffix}")
    workspace_id = create_workspace(
        admin["access_token"],
        f"Gateway Workspace {unique_suffix}",
        tariff_id,
        leader["id"],
    )
    add_member(workspace_id, member["id"], role=1, token=leader["access_token"])

    list_resp = requests.get(
        f"{gateway_url}{workspace_api_path}",
        headers=auth_header(member["access_token"]),
    )
    assert list_resp.status_code == 200
    list_body = list_resp.json()
    assert any(ws.get("id") == workspace_id for ws in list_body.get("workspaces", []))

    chat_id = create_chat(
        leader["access_token"],
        f"Project chat {unique_suffix}",
        workspace_id,
        [leader["id"], member["id"]],
    )

    send_resp = requests.post(
        f"{gateway_url}{chat_api_path}/{chat_id}/messages",
        json={"text": "Hello from member"},
        headers=auth_header(member["access_token"]),
    )
    assert send_resp.status_code == 201
    sent_message = send_resp.json()

    history_resp = requests.get(
        f"{gateway_url}{chat_api_path}/{chat_id}/messages",
        headers=auth_header(leader["access_token"]),
    )
    assert history_resp.status_code == 200
    history = history_resp.json()
    assert any(msg.get("id") == sent_message.get("id") for msg in history.get("messages", []))


def test_task_and_complaint_flow(
    gateway_url,
    workspace_api_path,
    chat_api_path,
    task_api_path,
    complaint_api_path,
    unique_suffix,
    create_admin,
    create_user,
    create_tariff,
    create_workspace,
    add_member,
    create_chat,
    auth_header,
):
    """
    Пользователь создает задачу в выбранном РП, меняет статус, привязывает к чату,
    а затем отправляет жалобу от имени участника.
    """
    admin = create_admin()
    leader = create_user(index=1)
    assignee = create_user(index=2)

    tariff_id = create_tariff(admin["access_token"], f"Tasks-{unique_suffix}")
    workspace_id = create_workspace(
        admin["access_token"],
        f"Tasks Workspace {unique_suffix}",
        tariff_id,
        leader["id"],
    )
    add_member(workspace_id, assignee["id"], role=1, token=leader["access_token"])

    chat_id = create_chat(
        leader["access_token"],
        f"Tasks chat {unique_suffix}",
        workspace_id,
        [leader["id"], assignee["id"]],
    )

    task_payload = {
        "title": f"Prepare report {unique_suffix}",
        "description": "Gateway end-to-end scenario",
        "workspace_id": workspace_id,
        "date": "2024-01-01",
        "assigned_users": [assignee["id"]],
        "status": 1,
    }
    create_task_resp = requests.post(
        f"{gateway_url}{task_api_path}",
        json=task_payload,
        headers=auth_header(leader["access_token"]),
    )
    assert create_task_resp.status_code == 201
    task_body = create_task_resp.json()
    task_id = task_body["id"]

    status_resp = requests.put(
        f"{gateway_url}{task_api_path}/{task_id}/status",
        json={"status": 2},
        headers=auth_header(leader["access_token"]),
    )
    assert status_resp.status_code == 200

    attach_resp = requests.post(
        f"{gateway_url}{task_api_path}/{task_id}/chats",
        json={"chat_id": chat_id},
        headers=auth_header(leader["access_token"]),
    )
    assert attach_resp.status_code in (200, 201)

    list_resp = requests.get(
        f"{gateway_url}{task_api_path}",
        params={"workspace_id": workspace_id},
        headers=auth_header(assignee["access_token"]),
    )
    assert list_resp.status_code == 200
    tasks_body = list_resp.json()
    assert any(task.get("id") == task_id for task in tasks_body.get("tasks", []))

    complaint_resp = requests.post(
        f"{gateway_url}{complaint_api_path}",
        json={
            "text": f"Client app issue {unique_suffix}",
            "device_description": "Windows 10; Chrome",
        },
        headers=auth_header(assignee["access_token"]),
    )
    assert complaint_resp.status_code == 201
    complaint_id = complaint_resp.json()["id"]

    complaint_list = requests.get(
        f"{gateway_url}{complaint_api_path}",
        headers=auth_header(assignee["access_token"]),
    )
    assert complaint_list.status_code == 200
    comp_body = complaint_list.json()
    assert any(item.get("id") == complaint_id for item in comp_body.get("complaints", []))

