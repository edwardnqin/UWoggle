from backend.user_helper import create_user, authenticate_user
from backend.db_helper import init_db, get_session


def setup_function():
    # Each test uses a fresh in-memory SQLite database
    init_db(url="sqlite:///:memory:")


def test_create_user_success():
    with get_session(url="sqlite:///:memory:") as db:
        user = create_user(db, email="test1@example.com", password="secret")
        assert user.id is not None
        assert user.email == "test1@example.com"


def test_duplicate_user_raises_value_error():
    with get_session(url="sqlite:///:memory:") as db:
        create_user(db, email="test2@example.com", password="secret")
        raised = False
        try:
            create_user(db, email="test2@example.com", password="other")
        except ValueError:
            raised = True
        assert raised


def test_authenticate_user_success_and_failure():
    with get_session(url="sqlite:///:memory:") as db:
        create_user(db, email="login@example.com", password="pass123")
        # Correct password
        user = authenticate_user(db, email="login@example.com", password="pass123")
        assert user is not None
        # Wrong password
        user_fail = authenticate_user(db, email="login@example.com", password="wrong")
        assert user_fail is None