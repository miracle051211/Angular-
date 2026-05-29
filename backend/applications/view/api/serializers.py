import re

from applications.models.post import CommentModel


def serialize_user(user):
    if not user:
        return None

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "avatar": user.avatar,
        "signature": user.signature,
        "isStaff": user.is_staff,
        "roleName": user.role.name if user.role else None,
    }


def serialize_board(board):
    return {
        "id": board.id,
        "name": board.name,
        "postCount": len([post for post in board.posts if post.is_active]),
    }


def serialize_post_summary(post):
    return {
        "id": post.id,
        "title": post.title,
        "excerpt": _make_excerpt(post.content),
        "readCount": post.read_count,
        "commentCount": post.comment_count(),
        "likeCount": post.like_count(),
        "createdAt": post.create_time.isoformat(),
        "board": serialize_board(post.board),
        "author": serialize_user(post.author),
    }


def serialize_post_detail(post):
    data = serialize_post_summary(post)
    data["content"] = post.content
    data["comments"] = [
        serialize_comment(comment)
        for comment in CommentModel.query.filter_by(
            post_id=post.id,
            parent_id=None,
            is_active=True,
        ).order_by(CommentModel.create_time.desc()).all()
    ]
    return data


def serialize_comment(comment):
    return {
        "id": comment.id,
        "content": comment.content,
        "createdAt": comment.create_time.isoformat(),
        "likeCount": comment.like_count(),
        "replyCount": comment.reply_count(),
        "author": serialize_user(comment.author),
        "replies": [
            serialize_comment(reply)
            for reply in comment.replies.filter_by(is_active=True).all()
        ],
    }


def _make_excerpt(content, limit=120):
    text = re.sub(r"<[^>]+>", "", content or "").strip()
    if len(text) <= limit:
        return text
    return text[:limit] + "..."
