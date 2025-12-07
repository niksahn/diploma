"""
Дополнительные сценарные тесты Gateway, покрывающие расширенные варианты
использования из `usecase_messendger`:
- управление тарифами и лидерством в РП;
- полный CRUD участников РП;
- разные типы чатов и управление участниками;
- полный CRUD сообщений + отметка прочитанного;
- задачи: обновление, исполнители, история, привязка к чатам;
- жалобы: пользователь + админский флоу.
"""
import requests


def _assert_ok(resp, expected=200):
    assert resp.status_code == expected, f"{resp.status_code} {resp.text}"


def test_workspace_leader_change_and_tariff_update(
    gateway_url,
    workspace_api_path,
    unique_suffix,
    create_admin,
    create_user,
    create_tariff,
    create_workspace,
    add_member,
    auth_header,
):
    admin = create_admin()
    leader = create_user(index=1)
    new_leader = create_user(index=2)

    tariff_id = create_tariff(admin["access_token"], f"Tariff-{unique_suffix}")
    workspace_id = create_workspace(
        admin["access_token"],
        f"Leadership WS {unique_suffix}",
        tariff_id,
        leader["id"],
    )
    add_member(workspace_id, new_leader["id"], role=1, token=leader["access_token"])

    # Передача лидерства
    change_resp = requests.put(
        f"{gateway_url}{workspace_api_path}/{workspace_id}/leader",
        json={"new_leader_id": new_leader["id"]},
        headers=auth_header(leader["access_token"]),
    )
    _assert_ok(change_resp)
    body = change_resp.json()
    assert body.get("new_leader_id") == new_leader["id"]

    # Обновление тарифа
    update_tariff = requests.put(
        f"{gateway_url}{workspace_api_path}/tariffs/{tariff_id}",
        json={"name": f"Tariff-{unique_suffix}-updated", "description": "Updated"},
        headers=auth_header(admin["access_token"]),
    )
    _assert_ok(update_tariff)


def test_workspace_membership_crud(
    gateway_url,
    workspace_api_path,
    unique_suffix,
    create_admin,
    create_user,
    create_tariff,
    create_workspace,
    add_member,
    auth_header,
):
    admin = create_admin()
    leader = create_user(index=1)
    member = create_user(index=2)

    tariff_id = create_tariff(admin["access_token"], f"Members-{unique_suffix}")
    workspace_id = create_workspace(
        admin["access_token"],
        f"Members WS {unique_suffix}",
        tariff_id,
        leader["id"],
    )

    # Добавление участника
    add_member(workspace_id, member["id"], role=1, token=leader["access_token"])

    # Изменение роли участника
    update_role = requests.put(
        f"{gateway_url}{workspace_api_path}/{workspace_id}/members/{member['id']}",
        json={"role": 2},
        headers=auth_header(leader["access_token"]),
    )
    _assert_ok(update_role)
    assert update_role.json().get("role") == 2

    # Удаление участника
    delete_member = requests.delete(
        f"{gateway_url}{workspace_api_path}/{workspace_id}/members/{member['id']}",
        headers=auth_header(leader["access_token"]),
    )
    _assert_ok(delete_member, expected=204)


def test_chat_types_and_member_management(
    gateway_url,
    chat_api_path,
    workspace_api_path,
    unique_suffix,
    create_admin,
    create_user,
    create_tariff,
    create_workspace,
    add_member,
    auth_header,
):
    admin = create_admin()
    leader = create_user(index=1)
    user_b = create_user(index=2)
    user_c = create_user(index=3)

    tariff_id = create_tariff(admin["access_token"], f"Chats-{unique_suffix}")
    workspace_id = create_workspace(
        admin["access_token"],
        f"Chats WS {unique_suffix}",
        tariff_id,
        leader["id"],
    )
    add_member(workspace_id, user_b["id"], role=1, token=leader["access_token"])
    add_member(workspace_id, user_c["id"], role=1, token=leader["access_token"])

    # Личный чат (type=1)
    personal = requests.post(
        f"{gateway_url}{chat_api_path}",
        json={
            "name": "",
            "type": 1,
            "workspace_id": workspace_id,
            "members": [leader["id"], user_b["id"]],
        },
        headers=auth_header(leader["access_token"]),
    )
    _assert_ok(personal, expected=201)

    # Канал (type=3)
    channel = requests.post(
        f"{gateway_url}{chat_api_path}",
        json={
            "name": f"Channel {unique_suffix}",
            "type": 3,
            "workspace_id": workspace_id,
            "members": [leader["id"], user_b["id"], user_c["id"]],
        },
        headers=auth_header(leader["access_token"]),
    )
    _assert_ok(channel, expected=201)
    channel_id = channel.json()["id"]

    # Обновление роли участника канала
    upd_role = requests.put(
        f"{gateway_url}{chat_api_path}/{channel_id}/members/{user_b['id']}",
        json={"role": 2},
        headers=auth_header(leader["access_token"]),
    )
    _assert_ok(upd_role)

    # Удаление участника канала
    del_role = requests.delete(
        f"{gateway_url}{chat_api_path}/{channel_id}/members/{user_c['id']}",
        headers=auth_header(leader["access_token"]),
    )
    _assert_ok(del_role, expected=204)


def test_message_crud_and_read_mark(
    gateway_url,
    chat_api_path,
    workspace_api_path,
    unique_suffix,
    create_admin,
    create_user,
    create_tariff,
    create_workspace,
    add_member,
    auth_header,
):
    admin = create_admin()
    leader = create_user(index=1)
    user_b = create_user(index=2)

    tariff_id = create_tariff(admin["access_token"], f"Msgs-{unique_suffix}")
    workspace_id = create_workspace(
        admin["access_token"],
        f"Msgs WS {unique_suffix}",
        tariff_id,
        leader["id"],
    )
    add_member(workspace_id, user_b["id"], role=1, token=leader["access_token"])

    chat_resp = requests.post(
        f"{gateway_url}{chat_api_path}",
        json={
            "name": f"Msgs Chat {unique_suffix}",
            "type": 2,
            "workspace_id": workspace_id,
            "members": [leader["id"], user_b["id"]],
        },
        headers=auth_header(leader["access_token"]),
    )
    _assert_ok(chat_resp, expected=201)
    chat_id = chat_resp.json()["id"]

    # Создание сообщения
    send_resp = requests.post(
        f"{gateway_url}{chat_api_path}/{chat_id}/messages",
        json={"text": "Hello!"},
        headers=auth_header(user_b["access_token"]),
    )
    _assert_ok(send_resp, expected=201)
    message_id = send_resp.json()["id"]

    # Редактирование сообщения
    edit_resp = requests.put(
        f"{gateway_url}{chat_api_path}/{chat_id}/messages/{message_id}",
        json={"text": "Hello edited"},
        headers=auth_header(user_b["access_token"]),
    )
    _assert_ok(edit_resp)
    assert edit_resp.json()["text"] == "Hello edited"

    # Отметка как прочитанное
    read_resp = requests.put(
        f"{gateway_url}{chat_api_path}/{chat_id}/messages/read",
        json={"last_message_id": message_id},
        headers=auth_header(leader["access_token"]),
    )
    _assert_ok(read_resp)
    assert read_resp.json().get("last_read_message_id") == message_id

    # Удаление сообщения
    del_resp = requests.delete(
        f"{gateway_url}{chat_api_path}/{chat_id}/messages/{message_id}",
        headers=auth_header(user_b["access_token"]),
    )
    _assert_ok(del_resp, expected=204)


def test_task_assignment_history_and_chat_links(
    gateway_url,
    task_api_path,
    chat_api_path,
    workspace_api_path,
    unique_suffix,
    create_admin,
    create_user,
    create_tariff,
    create_workspace,
    add_member,
    create_chat,
    auth_header,
):
    admin = create_admin()
    leader = create_user(index=1)
    assignee = create_user(index=2)

    tariff_id = create_tariff(admin["access_token"], f"TasksExt-{unique_suffix}")
    workspace_id = create_workspace(
        admin["access_token"],
        f"TasksExt WS {unique_suffix}",
        tariff_id,
        leader["id"],
    )
    add_member(workspace_id, assignee["id"], role=1, token=leader["access_token"])

    chat_id = create_chat(
        leader["access_token"],
        f"TasksExt chat {unique_suffix}",
        workspace_id,
        [leader["id"], assignee["id"]],
    )

    # Создание задачи
    create_task = requests.post(
        f"{gateway_url}{task_api_path}",
        json={
            "title": f"Task {unique_suffix}",
            "description": "Full flow",
            "workspace_id": workspace_id,
            "date": "2024-01-02",
            "status": 1,
        },
        headers=auth_header(leader["access_token"]),
    )
    _assert_ok(create_task, expected=201)
    task_id = create_task.json()["id"]

    # Обновление задачи
    upd_task = requests.put(
        f"{gateway_url}{task_api_path}/{task_id}",
        json={"title": "Task updated", "description": "Updated"},
        headers=auth_header(leader["access_token"]),
    )
    _assert_ok(upd_task)

    # Назначение исполнителя
    assign = requests.post(
        f"{gateway_url}{task_api_path}/{task_id}/assignees",
        json={"user_ids": [assignee["id"]]},
        headers=auth_header(leader["access_token"]),
    )
    _assert_ok(assign, expected=201)

    # Снятие исполнителя
    unassign = requests.delete(
        f"{gateway_url}{task_api_path}/{task_id}/assignees/{assignee['id']}",
        headers=auth_header(leader["access_token"]),
    )
    _assert_ok(unassign, expected=204)

    # История изменений
    history = requests.get(
        f"{gateway_url}{task_api_path}/{task_id}/history",
        headers=auth_header(leader["access_token"]),
    )
    _assert_ok(history)

    # Привязка к чату и отвязка
    attach = requests.post(
        f"{gateway_url}{task_api_path}/{task_id}/chats",
        json={"chat_id": chat_id},
        headers=auth_header(leader["access_token"]),
    )
    _assert_ok(attach, expected=201)

    detach = requests.delete(
        f"{gateway_url}{task_api_path}/{task_id}/chats/{chat_id}",
        headers=auth_header(leader["access_token"]),
    )
    _assert_ok(detach, expected=204)


def test_complaint_admin_flow(
    gateway_url,
    complaint_api_path,
    create_admin,
    create_user,
    auth_header,
):
    admin = create_admin()
    user = create_user()

    # Пользователь создаёт жалобу
    create_resp = requests.post(
        f"{gateway_url}{complaint_api_path}",
        json={
            "text": "App crash on attach",
            "device_description": "Win10 Chrome",
        },
        headers=auth_header(user["access_token"]),
    )
    _assert_ok(create_resp, expected=201)
    comp_id = create_resp.json()["id"]

    # Администратор просматривает список
    list_resp = requests.get(
        f"{gateway_url}{complaint_api_path}",
        headers=auth_header(admin["access_token"]),
    )
    _assert_ok(list_resp)
    assert any(c.get("id") == comp_id for c in list_resp.json().get("complaints", []))

    # Администратор меняет статус
    upd_resp = requests.put(
        f"{gateway_url}{complaint_api_path}/{comp_id}/status",
        json={"status": "in_progress", "comment": "Investigating"},
        headers=auth_header(admin["access_token"]),
    )
    _assert_ok(upd_resp)

    # Администратор удаляет жалобу
    del_resp = requests.delete(
        f"{gateway_url}{complaint_api_path}/{comp_id}",
        headers=auth_header(admin["access_token"]),
    )
    _assert_ok(del_resp, expected=204)

