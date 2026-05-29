from flask import Blueprint, send_from_directory
import os
from flask import current_app



bp = Blueprint('media', __name__)

@bp.route('/media/<path:filename>')
def media_file(filename):
    # 使用绝对路径来提供文件
    upload_path = current_app.config.get('UPLOAD_IMAGE_PATH')
    # 如果是相对路径，转换为绝对路径
    if not os.path.isabs(upload_path):
        upload_path = os.path.join(current_app.root_path, upload_path)
    return send_from_directory(upload_path, filename)