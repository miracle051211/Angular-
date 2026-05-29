from flask import Flask
from flask_caching import Cache

cache = Cache()

def init_cache(app: Flask):
    # 配置缓存
    app.config['CACHE_TYPE'] = 'simple'  # 使用简单缓存，生产环境可以使用Redis等
    app.config['CACHE_DEFAULT_TIMEOUT'] = 300  # 默认缓存时间300秒
    cache.init_app(app)