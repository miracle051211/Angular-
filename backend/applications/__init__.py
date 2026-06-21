import os

from flask import Flask
from sqlalchemy import inspect

from applications.common.script import init_script
from applications.config import DevelopmentConfig
from applications.extentions import init_plugs
from applications.extentions.init_sqlalchemy import db
from applications.view import init_bps


def create_app(config_object=DevelopmentConfig, ensure_schema=True):
    app = Flask(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    app.config.from_object(config_object)

    init_plugs(app)
    init_bps(app)
    init_script(app)

    if ensure_schema:
        with app.app_context():
            ensure_light_schema()

    return app


def ensure_light_schema():
    inspector = inspect(db.engine)
    if not inspector.has_table("user"):
        return
    user_columns = {column["name"] for column in inspector.get_columns("user")}
    if "gender" not in user_columns:
        with db.engine.begin() as connection:
            connection.exec_driver_sql("ALTER TABLE user ADD COLUMN gender VARCHAR(20) NULL")
