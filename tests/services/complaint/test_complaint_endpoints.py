"""
Функциональные тесты для Complaint Service

Покрывает эндпоинты:
- POST   /api/v1/complaints
- GET    /api/v1/complaints
- GET    /api/v1/complaints/:id
- PUT    /api/v1/complaints/:id/status
- DELETE /api/v1/complaints/:id
"""
import pytest
import requests


def _create_complaint(base_url, api_path, headers, body):
    url = f"{base_url}{api_path}"
    resp = requests.post(url, json=body, headers=headers)
    assert resp.status_code == 201, f"Create complaint failed: {resp.status_code} {resp.text}"
    data = resp.json()
    assert "id" in data
    return data


class TestCreateComplaint:
    def test_create_success(self, complaint_service_url, complaint_api_path, valid_complaint_body, user_headers):
        resp = requests.post(
            f"{complaint_service_url}{complaint_api_path}",
            json=valid_complaint_body,
            headers=user_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["text"] == valid_complaint_body["text"]
        assert data["device_description"] == valid_complaint_body["device_description"]
        assert data["status"] == "pending"
        assert data["author"] == int(user_headers["X-User-ID"])
        assert "created_at" in data
        assert "updated_at" in data

    def test_create_validation_error(self, complaint_service_url, complaint_api_path, user_headers):
        body = {"text": "short", "device_description": "a"}
        resp = requests.post(
            f"{complaint_service_url}{complaint_api_path}",
            json=body,
            headers=user_headers,
        )
        assert resp.status_code == 400

    def test_create_unauthorized(self, complaint_service_url, complaint_api_path, valid_complaint_body):
        resp = requests.post(
            f"{complaint_service_url}{complaint_api_path}",
            json=valid_complaint_body,
        )
        assert resp.status_code == 401


class TestListComplaints:
    def test_list_own_complaints(self, complaint_service_url, complaint_api_path, valid_complaint_body, user_headers):
        _create_complaint(complaint_service_url, complaint_api_path, user_headers, valid_complaint_body)

        resp = requests.get(
            f"{complaint_service_url}{complaint_api_path}",
            headers=user_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "complaints" in data
        assert data["total"] >= 1
        assert all(item["author"] == int(user_headers["X-User-ID"]) for item in data["complaints"])

    def test_list_as_admin_with_filters(self, complaint_service_url, complaint_api_path, valid_complaint_body, admin_headers):
        _create_complaint(complaint_service_url, complaint_api_path, admin_headers, valid_complaint_body)

        resp = requests.get(
            f"{complaint_service_url}{complaint_api_path}",
            headers=admin_headers,
            params={"status": "pending", "limit": 5, "offset": 0},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "complaints" in data
        assert data["limit"] == 5
        assert data["offset"] == 0


class TestGetComplaint:
    def test_get_own(self, complaint_service_url, complaint_api_path, valid_complaint_body, user_headers):
        created = _create_complaint(complaint_service_url, complaint_api_path, user_headers, valid_complaint_body)

        resp = requests.get(
            f"{complaint_service_url}{complaint_api_path}/{created['id']}",
            headers=user_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == created["id"]
        assert data["text"] == valid_complaint_body["text"]
        assert "status_history" in data

    def test_get_forbidden_for_other_user(self, complaint_service_url, complaint_api_path, valid_complaint_body, user_headers, other_user_headers):
        created = _create_complaint(complaint_service_url, complaint_api_path, user_headers, valid_complaint_body)

        resp = requests.get(
            f"{complaint_service_url}{complaint_api_path}/{created['id']}",
            headers=other_user_headers,
        )
        assert resp.status_code == 403

    def test_get_not_found(self, complaint_service_url, complaint_api_path, user_headers):
        resp = requests.get(
            f"{complaint_service_url}{complaint_api_path}/999999",
            headers=user_headers,
        )
        assert resp.status_code == 404


class TestUpdateStatus:
    def test_update_status_as_admin(self, complaint_service_url, complaint_api_path, valid_complaint_body, user_headers, admin_headers):
        created = _create_complaint(complaint_service_url, complaint_api_path, user_headers, valid_complaint_body)

        resp = requests.put(
            f"{complaint_service_url}{complaint_api_path}/{created['id']}/status",
            json={"status": "in_progress", "comment": "Investigating"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "in_progress"
        assert data["comment"] == "Investigating"

    def test_update_status_invalid_value(self, complaint_service_url, complaint_api_path, valid_complaint_body, user_headers, admin_headers):
        created = _create_complaint(complaint_service_url, complaint_api_path, user_headers, valid_complaint_body)

        resp = requests.put(
            f"{complaint_service_url}{complaint_api_path}/{created['id']}/status",
            json={"status": "invalid_status"},
            headers=admin_headers,
        )
        assert resp.status_code == 400

    def test_update_status_forbidden_for_user(self, complaint_service_url, complaint_api_path, valid_complaint_body, user_headers):
        created = _create_complaint(complaint_service_url, complaint_api_path, user_headers, valid_complaint_body)

        resp = requests.put(
            f"{complaint_service_url}{complaint_api_path}/{created['id']}/status",
            json={"status": "resolved"},
            headers=user_headers,
        )
        assert resp.status_code == 403


class TestDeleteComplaint:
    def test_delete_as_admin(self, complaint_service_url, complaint_api_path, valid_complaint_body, user_headers, admin_headers):
        created = _create_complaint(complaint_service_url, complaint_api_path, user_headers, valid_complaint_body)

        resp = requests.delete(
            f"{complaint_service_url}{complaint_api_path}/{created['id']}",
            headers=admin_headers,
        )
        assert resp.status_code == 204

        # Проверяем, что жалоба удалена
        resp_get = requests.get(
            f"{complaint_service_url}{complaint_api_path}/{created['id']}",
            headers=admin_headers,
        )
        assert resp_get.status_code == 404

    def test_delete_forbidden_for_user(self, complaint_service_url, complaint_api_path, valid_complaint_body, user_headers):
        created = _create_complaint(complaint_service_url, complaint_api_path, user_headers, valid_complaint_body)

        resp = requests.delete(
            f"{complaint_service_url}{complaint_api_path}/{created['id']}",
            headers=user_headers,
        )
        assert resp.status_code == 403



















