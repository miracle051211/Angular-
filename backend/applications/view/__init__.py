from flask import Flask
from applications.view.api import api_bp
from applications.view.system import register_system_bps

def init_bps(app:Flask):
    register_system_bps(app)
    app.register_blueprint(api_bp)
