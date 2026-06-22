import os

from flask import Blueprint, Response, abort, current_app, send_from_directory

bp = Blueprint("media", __name__)


def _candidate_media_roots():
    upload_path = current_app.config.get("UPLOAD_IMAGE_PATH", "static/images")
    roots = []

    if os.path.isabs(upload_path):
        roots.append(upload_path)
    else:
        roots.extend(
            [
                os.path.join(current_app.root_path, upload_path),
                os.path.abspath(upload_path),
                os.path.join(os.path.dirname(current_app.root_path), upload_path),
            ]
        )

    unique_roots = []
    seen = set()
    for root in roots:
        normalized = os.path.abspath(root)
        if normalized in seen:
            continue
        seen.add(normalized)
        unique_roots.append(normalized)
    return unique_roots


@bp.route("/media/<path:filename>")
def media_file(filename):
    for root in _candidate_media_roots():
        if os.path.isfile(os.path.join(root, filename)):
            return send_from_directory(root, filename)

    if filename.startswith("avatars/"):
        from applications.models.user import AvatarImageModel

        saved_name = filename.rsplit("/", 1)[-1]
        avatar = AvatarImageModel.query.filter_by(filename=saved_name).first()
        if avatar:
            return Response(
                avatar.data,
                mimetype=avatar.mime_type or "image/jpeg",
                headers={"Cache-Control": "public, max-age=31536000, immutable"},
            )

    abort(404)
