from backend.app.core.config import Settings


def test_render_postgres_urls_use_installed_psycopg_driver():
    assert Settings(database_url="postgres://demo:secret@db.example/demo").clean_database_url == (
        "postgresql+psycopg://demo:secret@db.example/demo"
    )
    assert Settings(database_url="postgresql://demo:secret@db.example/demo").clean_database_url == (
        "postgresql+psycopg://demo:secret@db.example/demo"
    )
    assert Settings(database_url="postgresql+psycopg://demo/db?pgbouncer=true").clean_database_url == (
        "postgresql+psycopg://demo/db"
    )
