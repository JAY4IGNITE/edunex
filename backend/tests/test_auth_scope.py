from fastapi.testclient import TestClient

from backend.app.main import app


def login(client, user_id):
    response=client.post("/api/auth/session",json={"user_id":user_id},headers={"X-Requested-With":"EduNex"})
    assert response.status_code==200,response.text


def test_auth_required_demo_picker_and_private_cache_headers():
    client=TestClient(app)
    assert client.get("/api/students").status_code==401
    picker=client.get("/api/auth/users")
    assert picker.status_code==200 and len(picker.json()["users"])==5
    login(client,"faculty-demo")
    students=client.get("/api/students?limit=1000")
    assert students.status_code==200
    assert students.headers["cache-control"]=="private, no-store"
    assert {row["department"] for row in students.json()}=={"Computer Science"}


def test_server_scopes_direct_student_and_department_aggregates():
    faculty=TestClient(app)
    login(faculty,"faculty-demo")
    own=faculty.get("/api/students?limit=1").json()[0]
    assert faculty.get(f"/api/students/{own['student_id']}").status_code==200
    admin=TestClient(app)
    login(admin,"dean-demo")
    other=admin.get("/api/students?department=Information+Technology&limit=1").json()[0]
    assert faculty.get(f"/api/students/{other['student_id']}").status_code==404
    dept=faculty.get("/api/analytics/overview")
    total=admin.get("/api/analytics/overview")
    assert dept.status_code==200 and total.status_code==200
    assert dept.json()["total_students"] < total.json()["total_students"]


def test_public_demo_auth_does_not_allow_cross_site_mutations():
    client=TestClient(app)
    rejected=client.post("/api/auth/session",json={"user_id":"dean-demo"},headers={"Origin":"https://attacker.invalid","X-Requested-With":"EduNex"})
    assert rejected.status_code==403
    missing_header=client.post("/api/auth/session",json={"user_id":"dean-demo"})
    assert missing_header.status_code==403
    login(client,"mentor-demo")
    blocked=client.post("/api/interventions",json={"student_id":"STU0001","recommendation_key":"learning-support"},headers={"X-Requested-With":"EduNex"})
    assert blocked.status_code==403


def test_mentor_caseload_and_tasks_are_scoped():
    mentor=TestClient(app)
    login(mentor,"mentor-demo")
    rows=mentor.get("/api/students?limit=1000").json()
    assert rows
    assert mentor.get(f"/api/students/{rows[0]['student_id']}").status_code==200
    admin=TestClient(app)
    login(admin,"dean-demo")
    all_students=admin.get("/api/students?limit=1000").json()
    assert len(rows)<len(all_students)
    outside=next(row for row in all_students if row["student_id"] not in {s["student_id"] for s in rows})
    assert mentor.get(f"/api/students/{outside['student_id']}").status_code==404
