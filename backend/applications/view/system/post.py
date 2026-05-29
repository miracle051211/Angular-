from flask import Blueprint, request, render_template, g, jsonify
from applications.models.post import BoardModel, PostModel, CommentModel, LikeModel, ReportModel
from applications.models import NotificationModel, NotificationType, UserModel
from applications.forms.post import PublicPostForm
from applications.common.utils.decorators import login_required
from applications.extentions.init_sqlalchemy import db
from applications.common.utils.restful import ok, params_error as restful_params_error
from applications.common.utils.ai_service import ai_service
from applications.utils.notification import create_notification
import traceback


bp = Blueprint("post", __name__, url_prefix = "/post")

@bp.route("/public", methods = ["GET", "POST"])
@login_required
def public_post():
    if request.method == "GET":
        boards = BoardModel.query.filter_by(is_active = 1).all()
        return render_template("front/public_post.html", boards = boards)
    else:
        try:
            # 同时支持表单提交和JSON请求
            if request.is_json:
                data = request.get_json()
                title = data.get('title')
                board_id = data.get('board_id')
                content = data.get('content')
                
                # 手动验证数据
                if not title or not title.strip():
                    return restful_params_error(message="标题不能为空")
                if not board_id:
                    return restful_params_error(message="请选择板块")
                if not content or not content.strip():
                    return restful_params_error(message="内容不能为空")
                
                # 创建帖子
                post = PostModel(title = title.strip(), content = content.strip(), board_id = int(board_id), author = g.user)
                db.session.add(post)
                db.session.commit()
                return ok()
            else:
                # 传统表单提交
                form = PublicPostForm(request.form)
                if form.validate():
                    title = form.title.data
                    board_id = form.board_id.data
                    content = form.content.data
                    post = PostModel(title = title, content = content, board_id = board_id, author = g.user)
                    db.session.add(post)
                    db.session.commit()
                    return ok()
                else:
                    message = form.messages[0] if form.messages else "表单验证失败"
                    return restful_params_error(message = message)
        except Exception as e:
            print(traceback.format_exc())
            return jsonify({"code": 500, "message": f"Internal server error: {str(e)}"}), 500

@bp.get("/detail/<int:post_id>")
def post_detail(post_id):
    post = PostModel.query.join(BoardModel, PostModel.board_id == BoardModel.id).filter(
        PostModel.id == post_id, PostModel.is_active == True, BoardModel.is_active == True
    ).first()
    if not post:
        # 如果找不到帖子或帖子已被隐藏，返回错误
        return render_template('errors/404.html'), 404
    # 检查帖子所属板块是否活跃
    if not post.board.is_active:
        return render_template('errors/404.html'), 404
    post.read_count += 1
    db.session.commit()
    return render_template("front/post_detail.html", post = post)


@bp.post("/like")
def toggle_like():
    """
    切换点赞状态
    """
    if not hasattr(g, 'user') or not g.user:
        return jsonify({"code": 1, "msg": "请先登录"})
    
    user_id = g.user.id
    post_id = request.json.get("post_id")
    comment_id = request.json.get("comment_id")
    
    # 验证参数
    if not (post_id or comment_id):
        return restful_params_error(message="缺少必要参数")
    
    if post_id and comment_id:
        return restful_params_error(message="只能同时点赞帖子或评论")
    
    # 查询是否已点赞
    if post_id:
        like = LikeModel.query.filter_by(user_id=user_id, post_id=post_id).first()
        target = PostModel.query.join(BoardModel, PostModel.board_id == BoardModel.id).filter(
            PostModel.id == post_id, 
            PostModel.is_active == True, 
            BoardModel.is_active == True
        ).first()
    else:
        like = LikeModel.query.filter_by(user_id=user_id, comment_id=comment_id).first()
        target = CommentModel.query.get(comment_id)

    if not target:
        return restful_params_error(message="目标不存在")
    
    if like:
        # 取消点赞
        db.session.delete(like)
        db.session.commit()
        return ok(data={"liked": False, "count": target.like_count()})
    else:
        # 添加点赞
        like = LikeModel(user_id=user_id, post_id=post_id, comment_id=comment_id)
        db.session.add(like)
        db.session.commit()
        
        # 创建通知
        if post_id:
            # 点赞帖子
            post = PostModel.query.join(BoardModel, PostModel.board_id == BoardModel.id).filter(
                PostModel.id == post_id, 
                PostModel.is_active == True, 
                BoardModel.is_active == True
            ).first()
            if post and post.author_id != user_id:  # 不向自己发送通知
                create_notification(
                    user_id=post.author_id,
                    sender_id=user_id,
                    notify_type=NotificationType.POST_LIKE,
                    content=f"用户{g.user.username}点赞了你的帖子",
                    related_id=post_id,
                    related_type="post",
                    related_post_id=post_id
                )
        else:
            # 点赞评论
            comment = CommentModel.query.get(comment_id)
            if comment and comment.author_id != user_id:  # 不向自己发送通知
                create_notification(
                    user_id=comment.author_id,
                    sender_id=user_id,
                    notify_type=NotificationType.COMMENT_LIKE,
                    content=f"用户{g.user.username}点赞了你的评论",
                    related_id=comment_id,
                    related_type="comment",
                    related_post_id=comment.post_id
                )
        
        return ok(data={"liked": True, "count": target.like_count()})


@bp.post("/report")
@login_required
def report_post_or_comment():
    """
    举报帖子或评论
    """
    user_id = g.user.id
    post_id = request.json.get("post_id")
    comment_id = request.json.get("comment_id")
    reason = request.json.get("reason", "")
    
    # 验证参数
    if not (post_id or comment_id):
        return restful_params_error(message="缺少必要参数")
    
    if post_id and comment_id:
        return restful_params_error(message="只能同时举报帖子或评论")
    
    if not reason.strip():
        return restful_params_error(message="举报原因不能为空")
    
    # 检查目标是否存在
    if post_id:
        target = PostModel.query.join(BoardModel, PostModel.board_id == BoardModel.id).filter(
            PostModel.id == post_id, 
            PostModel.is_active == True, 
            BoardModel.is_active == True
        ).first()
    else:
        target = CommentModel.query.get(comment_id)
    
    if not target:
        return restful_params_error(message="目标不存在")
    
    # 创建举报记录
    report = ReportModel(
        user_id=user_id,
        post_id=post_id,
        comment_id=comment_id,
        reason=reason.strip()
    )
    
    db.session.add(report)
    db.session.commit()
    
    return ok(message="举报成功")


@bp.post("/reply")
@login_required
def reply_to_comment():
    """
    回复评论
    """
    user_id = g.user.id
    post_id = request.json.get("post_id")
    comment_id = request.json.get("comment_id")
    content = request.json.get("content", "")
    
    # 验证参数
    if not post_id:
        return restful_params_error(message="缺少帖子ID")
    
    if not comment_id:
        return restful_params_error(message="缺少评论ID")
    
    if not content.strip():
        return restful_params_error(message="回复内容不能为空")
    
    # 检查帖子和评论是否存在
    post = PostModel.query.join(BoardModel, PostModel.board_id == BoardModel.id).filter(
        PostModel.id == post_id, 
        PostModel.is_active == True, 
        BoardModel.is_active == True
    ).first()
    if not post:
        return restful_params_error(message="帖子不存在")

    parent_comment = CommentModel.query.get(comment_id)
    if not parent_comment:
        return restful_params_error(message="评论不存在")
    
    # 创建回复评论
    new_comment = CommentModel(
        content=content.strip(),
        author_id=user_id,
        post_id=post_id,
        parent_id=comment_id
    )
    
    db.session.add(new_comment)
    db.session.commit()
    
    # 创建通知
    if parent_comment.author_id != user_id:  # 不向自己发送通知
        create_notification(
            user_id=parent_comment.author_id,
            sender_id=user_id,
            notify_type=NotificationType.COMMENT_REPLY,
            content=f"用户{g.user.username}回复了你的评论",
            related_id=comment_id,
            related_type="comment",
            related_post_id=post_id
        )
    
    # 返回新创建的回复信息
    return ok(data={
        "id": new_comment.id,
        "content": new_comment.content,
        "create_time": new_comment.create_time.strftime("%Y-%m-%d %H:%M:%S"),
        "author": {
            "username": new_comment.author.username,
            "avatar": new_comment.author.avatar
        },
        "like_count": 0,
        "is_liked": False,
        "reply_count": 0
    })


# AI辅助创作相关路由
@bp.post("/ai/generate-inspiration")
# @login_required
def ai_generate_inspiration():
    """
    生成创作灵感
    """
    try:
        prompt = request.json.get("prompt")
        result = ai_service.generate_inspiration(prompt)
        return jsonify({"result": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.post("/ai/continue-content")
# @login_required
def ai_continue_content():
    """
    内容续写
    """
    try:
        existing_content = request.json.get("existing_content")
        prompt = request.json.get("prompt")
        if not existing_content:
            return jsonify({"error": "现有内容不能为空"}), 400
        result = ai_service.continue_content(existing_content, prompt)
        return jsonify({"result": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.post("/ai/optimize-structure")
@login_required
def ai_optimize_structure():
    """
    结构优化
    """
    content = request.json.get("content")
    prompt = request.json.get("prompt")
    result = ai_service.optimize_structure(content, prompt)
    return jsonify({"result": result})


@bp.post("/ai/polish-content")
@login_required
def ai_polish_content():
    """
    AI润色
    """
    content = request.json.get("content")
    prompt = request.json.get("prompt")
    result = ai_service.polish_content(content, prompt)
    return jsonify({"result": result})


@bp.post("/ai/generate-reply-template")
@login_required
def ai_generate_reply_template():
    """
    生成专业回复模板
    """
    context = request.json.get("context")
    prompt = request.json.get("prompt")
    result = ai_service.generate_reply_template(context, prompt)
    return jsonify({"result": result})