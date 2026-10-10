from backend.app.core.database import Base as DatabaseBase
from backend.app.models.base import Base


def test_models_base_re_exports_database_base():
    assert Base is DatabaseBase
