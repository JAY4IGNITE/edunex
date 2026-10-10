import time

from backend.app.core.demo_auth import session_user


def test_session_user_requires_active_demo_session():
    session = {}
    assert session_user(session) is None
    assert session == {}


def test_session_user_reads_valid_user_and_clears_expired():
    active = {"user_id":"faculty-demo","expires_at":time.time()+60}
    assert session_user(active)["id"] == "faculty-demo"
    expired = {"user_id":"faculty-demo","expires_at":time.time()-1}
    assert session_user(expired) is None
    assert expired == {}


def test_session_user_clears_unknown_user():
    stale = {"user_id":"missing-demo","expires_at":time.time()+60}
    assert session_user(stale) is None
    assert stale == {}
