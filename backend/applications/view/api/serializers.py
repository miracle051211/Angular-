import re

from flask_login import current_user

from applications.models.post import CommentModel
from applications.models.user import FollowModel


def serialize_user(user, include_private=False):
    if not user:
        return None

    is_authenticated = bool(getattr(current_user, "is_authenticated", False))
    current_user_id = getattr(current_user, "id", None) if is_authenticated else None
    is_self = is_authenticated and current_user_id == user.id
    can_view_email = include_private or is_self
    is_following = False
    if is_authenticated and current_user_id != user.id:
        is_following = (
            FollowModel.query.filter_by(
                follower_id=current_user_id,
                followed_id=user.id,
            ).first()
            is not None
        )

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email if can_view_email else None,
        "avatar": user.avatar,
        "signature": user.signature,
        "gender": getattr(user, "gender", None),
        "isStaff": user.is_staff,
        "roleName": user.role.name if user.role else None,
        "experience": user.experience or 0,
        "title": user.title_profile,
        "permissions": [permission.name.value for permission in user.role.permissions] if user.role else [],
        "followerCount": user.follower_relations.count(),
        "followingCount": user.following_relations.count(),
        "isFollowing": is_following,
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
        "isLiked": post.is_liked_by(current_user),
        "createdAt": post.create_time.isoformat(),
        "board": serialize_board(post.board),
        "author": serialize_user(post.author),
        "images": [serialize_post_image(image) for image in post.images.all()],
    }


def serialize_post_detail(post):
    data = serialize_post_summary(post)
    data["content"] = post.content
    data["images"] = [serialize_post_image(image) for image in post.images.all()]
    data["comments"] = [
        serialize_comment(comment)
        for comment in CommentModel.query.filter_by(
            post_id=post.id,
            parent_id=None,
            is_active=True,
        ).order_by(CommentModel.create_time.desc()).all()
    ]
    return data


def serialize_post_image(image):
    return {
        "id": image.id,
        "url": image.url,
        "originalName": image.original_name,
    }


def serialize_comment(comment):
    return {
        "id": comment.id,
        "content": comment.content,
        "createdAt": comment.create_time.isoformat(),
        "likeCount": comment.like_count(),
        "isLiked": comment.is_liked_by(current_user),
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
