from flask import Flask
from .commands import admin_cli

def init_script(app:Flask):
    app.cli.add_command(admin_cli)
