from flask import jsonify


def api_success(data=None, message="操作成功", status=200):
    return jsonify({
        "data": data,
        "message": message,
        "error": None,
    }), status


def api_error(message="请求失败", status=400, data=None):
    return jsonify({
        "data": data,
        "message": message,
        "error": message,
    }), status
