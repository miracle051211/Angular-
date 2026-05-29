from flask import Flask
from flask_wtf import CSRFProtect

csrf = CSRFProtect()

def init_csrf(app:Flask):
    csrf.init_app(app)