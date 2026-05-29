from flask import Flask
from flask_cors import CORS

cors = CORS()


def init_cors(app: Flask):
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", [])}},
        supports_credentials=True,
    )
