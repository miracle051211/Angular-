from flask import Flask
from flask_avatars import Avatars

avatars = Avatars()

def init_avatars(app:Flask):
    avatars.init_app(app)