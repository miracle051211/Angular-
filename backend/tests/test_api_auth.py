import unittest

from applications import create_app
from applications.config import TestingConfig
from applications.extentions.init_sqlalchemy import db
from applications.models import UserModel


class AuthApiTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig, ensure_schema=False)
        self.client = self.app.test_client()
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()

        self.user = UserModel(
            username="jwt_tester",
            email="jwt_tester@example.com",
            password="123456",
        )
        db.session.add(self.user)
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.context.pop()

    def test_login_returns_access_token(self):
        response = self.client.post(
            "/api/auth/login",
            json={
                "email": "jwt_tester@example.com",
                "password": "123456",
                "remember": False,
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertIn("token", body["data"])
        self.assertTrue(body["data"]["token"])
        self.assertEqual(body["data"]["user"]["email"], "jwt_tester@example.com")

    def test_protected_endpoint_without_token_returns_401(self):
        response = self.client.get("/api/auth/me")

        self.assertEqual(response.status_code, 401)
        body = response.get_json()
        self.assertIsNone(body["data"])
        self.assertIsNotNone(body["error"])


if __name__ == "__main__":
    unittest.main()
