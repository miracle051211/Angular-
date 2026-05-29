from flask import Blueprint, render_template, redirect, g, request, flash, url_for, current_app
from applications.models.user import PermissionEnum, UserModel, RoleModel
from applications.models.post import PostModel, CommentModel, BoardModel, ReportModel, LikeModel
from applications.common.utils.decorators import permission_required
from applications.forms.cms import AddStaffForm ,EditStaffForm, AddBoardForm, EditBoardForm
from applications.extentions.init_sqlalchemy import db
from applications.extentions.init_cache import cache
from applications.common.utils import restful
from flask_paginate import Pagination

bp = Blueprint("cms", __name__, url_prefix = "/cms")

@bp.before_request
def cms_before_request():
    if not hasattr(g, "user") or g.user.is_staff == False:
        return redirect("/")

@bp.context_processor
def cms_context_processor():
    return {"PermissionEnum":PermissionEnum}

@bp.get("")
def index():
    # 分别查询统计数据以避免SQL语法错误
    from sqlalchemy import func
    from sqlalchemy.orm import joinedload
    from datetime import datetime, timedelta
    
    # 获取当前时间
    now = datetime.now()
    
    # 获取各类统计数据
    post_count = db.session.query(func.count(PostModel.id)).scalar() or 0
    user_count = db.session.query(func.count(UserModel.id)).filter(UserModel.is_staff == False).scalar() or 0
    comment_count = db.session.query(func.count(CommentModel.id)).scalar() or 0
    board_count = db.session.query(func.count(BoardModel.id)).scalar() or 0
    
    # 计算今日新增帖子数
    today = now.date()
    post_count_today = db.session.query(func.count(PostModel.id)).filter(
        func.date(PostModel.create_time) == today
    ).scalar() or 0
    
    # 获取最近帖子（也缓存1分钟）
    recent_posts = cache.get('recent_posts')
    if recent_posts is None:
        recent_posts = PostModel.query.options(
            joinedload(PostModel.author)
        ).join(BoardModel, PostModel.board_id == BoardModel.id).filter(
            PostModel.is_active == True, BoardModel.is_active == True
        ).order_by(PostModel.create_time.desc()).limit(5).all()
        cache.set('recent_posts', recent_posts, timeout=60)
    
    # 传递数据给模板
    context = {
        "now": now,
        "post_count": post_count,
        "user_count": user_count,
        "comment_count": comment_count,
        "board_count": board_count,
        "post_count_today": post_count_today,
        "recent_posts": recent_posts
    }
    
    return render_template("cms/index.html", **context)

@bp.get("/staff/list")
@permission_required(PermissionEnum.CMD_USER)
def staff_list():
    users = UserModel.query.filter_by(is_staff = True).all()
    return render_template("cms/staff_list.html", users = users)

@bp.route("staff/add", methods = ['GET', 'POST'])
@permission_required(PermissionEnum.CMD_USER)
def add_staff():
    if request.method == "GET":
        roles = RoleModel.query.all()
        return render_template("cms/add_staff.html", roles = roles)
    
    else:
        form = AddStaffForm(request.form)
        email = form.email.data
        role_id = form.role.data
        user = UserModel.query.filter_by(email = email).first()
        if not user:
            flash("没有此用户")
            return redirect(url_for("cms.add_staff"))
        user.is_staff = True
        user.role = RoleModel.query.get(role_id)
        db.session.commit()
        # 清除可能的缓存
        cache.delete_memoized(index)
        return redirect(url_for("cms.staff_list"))
    
@bp.route("/staff/edit/<string:user_id>", methods = ['GET', 'POST'])
@permission_required(PermissionEnum.CMD_USER)
def edit_staff(user_id):
    user = UserModel.query.get(user_id)
    if request.method == "GET":
        roles = RoleModel.query.all()
        return render_template("cms/edit_staff.html", user = user, roles = roles)
    else:
        form = EditStaffForm(request.form)
        if form.validate():
            is_staff = bool(form.is_staff.data)
            user.is_staff = is_staff
            
            # 如果设置为非员工，清除其角色
            if not is_staff:
                user.role = None
            # 如果设置为员工，根据表单选择的角色更新
            else:
                role_id = form.role.data
                if not role_id:
                    flash("请选择角色", "error")
                    return redirect(url_for("cms.edit_staff", user_id = user_id))
                if user.role and user.role.id != role_id:
                    user.role = RoleModel.query.get(role_id)
                elif not user.role:
                    user.role = RoleModel.query.get(role_id)
            
            db.session.commit()
            flash("员工信息修改成功！", "success")
            # 清除可能的缓存
            cache.delete_memoized(index)
            return redirect(url_for("cms.edit_staff", user_id = user_id))
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    flash(error, "error")
            return redirect(url_for("cms.edit_staff", user_id = user_id))
        
@bp.route("/users")
@permission_required(PermissionEnum.FRONT_USER)
def user_list():
    users = UserModel.query.filter_by(is_staff = False).all()
    return render_template("cms/users.html", users = users)

@bp.route("/users/active/<string:user_id>", methods = ["POST"])
@permission_required(PermissionEnum.FRONT_USER)
def active_user(user_id):
    # 尝试从JSON获取数据，如果失败则尝试从form获取
    json_data = request.get_json()
    if json_data:
        is_active = json_data.get("is_active")
    else:
        # 如果JSON为空，尝试从form数据获取
        is_active = request.form.get("is_active")
    
    if is_active is None:
        return restful.params_error(message = "请传入is_active参数!")
    
    try:
        is_active = int(is_active)
    except (ValueError, TypeError):
        return restful.params_error(message = "is_active参数必须是整数")
        
    user = UserModel.query.get(user_id)
    if not user:
        return restful.params_error(message = "用户不存在!")
    
    user.is_active = bool(is_active)
    db.session.commit()
    return restful.ok()

@bp.get("/posts")
@permission_required(PermissionEnum.POST)
def post_list():
    # 获取页码参数
    page = request.args.get("page", type = int, default = 1)
    # 每页显示数量
    per_page = current_app.config.get("PER_PAGE_COUNT")
    # 使用paginate方法进行分页查询，并预加载关联对象
    from sqlalchemy.orm import joinedload
    pagination_obj = PostModel.query\
        .join(BoardModel, PostModel.board_id == BoardModel.id)\
        .filter(BoardModel.is_active == True)\
        .options(joinedload(PostModel.board), joinedload(PostModel.author))\
        .order_by(PostModel.create_time.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    # 分页对象
    pagination = Pagination(
        bs_version=4, 
        page=page, 
        per_page=per_page, 
        total=pagination_obj.total, 
        outer_window=0, 
        inner_window=2, 
        alignment="center"
    )

    context = {
        "posts": pagination_obj.items,
        "pagination": pagination
    }

    return render_template("cms/posts.html", **context)

@bp.post('/posts/active/<int:post_id>')
def active_post(post_id):
    json_data = request.get_json()
    is_active = json_data.get("is_active")
    if is_active is None:
        return restful.params_error(message = "请传入is_active参数!")
    
    try:
        is_active = int(is_active)
    except (ValueError, TypeError):
        return restful.params_error(message = "is_active参数必须是整数")
        
    post = PostModel.query.get(post_id)
    post.is_active = bool(is_active)
    db.session.commit()
    return restful.ok()

@bp.post('/posts/delete/<int:post_id>')
@permission_required(PermissionEnum.POST)
def delete_post(post_id):
    post = PostModel.query.get(post_id)
    if not post:
        return restful.params_error(message = "帖子不存在!")
    
    # 删除帖子相关的点赞、评论和举报
    LikeModel.query.filter_by(post_id=post_id).delete()
    CommentModel.query.filter_by(post_id=post_id).delete()
    ReportModel.query.filter_by(post_id=post_id).delete()
    
    # 删除帖子
    db.session.delete(post)
    db.session.commit()
    return restful.ok()

@bp.get("/comments")
@permission_required(PermissionEnum.COMMENT)
def comment_list():
    # 获取页码参数
    page = request.args.get("page", type = int, default = 1)
    # 每页显示数量
    per_page = current_app.config.get("PER_PAGE_COUNT")
    # 使用paginate方法进行分页查询，使用outerjoin确保即使没有关联的post或user也能查询到
    from sqlalchemy.orm import joinedload
    pagination_obj = CommentModel.query\
        .outerjoin(PostModel, CommentModel.post_id == PostModel.id)\
        .outerjoin(UserModel, CommentModel.author_id == UserModel.id)\
        .options(joinedload(CommentModel.post), joinedload(CommentModel.author))\
        .order_by(CommentModel.create_time.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    # 分页对象
    pagination = Pagination(
        bs_version = 4, 
        page = page, 
        per_page=per_page, 
        total = pagination_obj.total, 
        outer_window = 0, 
        inner_window = 2, 
        alignment = "center"
    )

    context = {
        "comments": pagination_obj.items,
        "pagination": pagination
    }
    
    return render_template("cms/comments.html", **context)

@bp.post("/comments/active/<int:comment_id>")
def active_comment(comment_id):
    json_data = request.get_json()
    is_active = json_data.get("is_active")
    if is_active is None:
        return restful.params_error(message = "请传入is_active参数")
    
    try:
        is_active = int(is_active)
    except (ValueError, TypeError):
        return restful.params_error(message = "is_active参数必须是整数")
    
    comment = CommentModel.query.get(comment_id)
    comment.is_active = bool(is_active)
    db.session.commit()
    return restful.ok()

@bp.post("/comments/delete/<int:comment_id>")
@permission_required(PermissionEnum.COMMENT)
def delete_comment(comment_id):
    comment = CommentModel.query.get(comment_id)
    if not comment:
        return restful.params_error(message = "评论不存在!")
    
    # 删除评论相关的点赞和举报
    LikeModel.query.filter_by(comment_id=comment_id).delete()
    ReportModel.query.filter_by(comment_id=comment_id).delete()
    
    # 如果有回复评论，将它们的parent_id设为NULL
    replies = CommentModel.query.filter_by(parent_id=comment_id).all()
    for reply in replies:
        reply.parent_id = None
    
    # 删除评论
    db.session.delete(comment)
    db.session.commit()
    return restful.ok()

@bp.get("/boards")
@permission_required(PermissionEnum.Board)
def board_list():
    # 缓存板块列表
    boards = cache.get('boards_list')
    if boards is None:
        from sqlalchemy.orm import joinedload
        boards = BoardModel.query.options(joinedload(BoardModel.posts)).all()
        cache.set('boards_list', boards, timeout=300)  # 缓存5分钟
    return render_template("cms/boards.html", boards = boards)

@bp.post("/boards/active/<int:board_id>")
@permission_required(PermissionEnum.Board)
def active_board(board_id):
    json_data = request.get_json()
    is_active = json_data.get("is_active")
    if is_active is None:
        return restful.params_error(message = "请上传is_active参数!")
    
    try:
        is_active = int(is_active)
    except (ValueError, TypeError):
        return restful.params_error(message = "is_active参数必须是整数")
        
    board = BoardModel.query.get(board_id)
    board.is_active = bool(is_active)
    db.session.commit()
    
    # 清除板块列表缓存
    cache.delete('boards_list')
    
    return restful.ok()

@bp.route("/board/add", methods = ["POST","GET"])
@permission_required(PermissionEnum.Board)
def add_board():
    if request.method == "GET":
        return render_template("cms/add_board.html")
    else:
        form = AddBoardForm(request.form)
        if form.validate():
            boardname = form.boardname.data
            board = BoardModel(name = boardname,is_active = 1)
            db.session.add(board)
            db.session.commit()
            
            # 清除板块列表缓存
            cache.delete('boards_list')
            
            return redirect(url_for('cms.board_list'))
        else:
            for message in form.messages:
                flash(message)
            return redirect(url_for('cms.add_board'))

@bp.route("/board/edit/<int:board_id>", methods = ["POST", "GET"])
@permission_required(PermissionEnum.Board)
def edit_board(board_id):
    board = BoardModel.query.get(board_id)
    if request.method == "GET":
        return render_template("cms/edit_board.html", board = board)
    else:
        form = EditBoardForm(request.form)
        if form.validate():
            boardname = form.boardname.data
            board.name = boardname
            db.session.commit()
            
            # 清除板块列表缓存
            cache.delete('boards_list')
            
            return redirect(url_for('cms.board_list'))
        else:
            for message in form.messages:
                flash(message)
            return redirect(url_for('cms.edit_board', board_id = board.id))

@bp.get("/reports")
@permission_required(PermissionEnum.POST)
def report_list():
    # 获取页码参数
    page = request.args.get("page", type = int, default = 1)
    # 每页显示数量
    per_page = current_app.config.get("PER_PAGE_COUNT")
    # 使用paginate方法进行分页查询，关联帖子、评论和用户信息
    from sqlalchemy.orm import joinedload
    pagination_obj = ReportModel.query\
        .outerjoin(PostModel, ReportModel.post_id == PostModel.id)\
        .outerjoin(CommentModel, ReportModel.comment_id == CommentModel.id)\
        .outerjoin(UserModel, ReportModel.user_id == UserModel.id)\
        .options(
            joinedload(ReportModel.post),
            joinedload(ReportModel.comment),
            joinedload(ReportModel.user)
        )\
        .order_by(ReportModel.create_time.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    # 分页对象
    pagination = Pagination(
        bs_version = 4, 
        page = page, 
        per_page=per_page, 
        total = pagination_obj.total, 
        outer_window = 0, 
        inner_window = 2, 
        alignment = "center"
    )

    context = {
        "reports": pagination_obj.items,
        "pagination": pagination
    }
    
    return render_template("cms/reports.html", **context)

@bp.post("/reports/handle/<int:report_id>")
def handle_report(report_id):
    report = ReportModel.query.get(report_id)
    if not report:
        return restful.params_error(message = "举报不存在")
    
    # 切换处理状态
    report.is_handled = not report.is_handled
    db.session.commit()
    return restful.ok()

@bp.post("/reports/delete/<int:report_id>")
def delete_report(report_id):
    report = ReportModel.query.get(report_id)
    if not report:
        return restful.params_error(message = "举报不存在")
    
    db.session.delete(report)
    db.session.commit()
    return restful.ok()

@bp.post("/reports/hide-post/<int:post_id>")
def hide_post(post_id):
    post = PostModel.query.get(post_id)
    if not post:
        return restful.params_error(message = "帖子不存在")
    
    # 切换帖子的隐藏状态
    post.is_active = not post.is_active
    
    # 获取report_id参数，如果提供了，则将对应的举报标记为已处理
    report_id = request.form.get("report_id", type = int)
    if report_id:
        report = ReportModel.query.get(report_id)
        if report:
            report.is_handled = True
    
    db.session.commit()
    return restful.ok()




    

    



