from fastapi.testclient import TestClient as BaseTestClient


class AuthenticatedTestClient(BaseTestClient):
    """Legacy endpoint tests exercise routes as the public synthetic Dean demo."""
    def __init__(self,*args,**kwargs):
        super().__init__(*args,**kwargs)
        response=self.post("/api/auth/session",json={"user_id":"dean-demo"},headers={"X-Requested-With":"EduNex"})
        if response.status_code != 200:
            raise AssertionError(f"Unable to create synthetic test session: {response.status_code} {response.text}")
