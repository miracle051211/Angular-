# encoding: utf-8
__author__ = 'Miracle'
from flask import Blueprint, render_template, request, jsonify, redirect, url_for
from flask_login import current_user
from flask_paginate import Pagination
from applications.models.post import PostModel, CommentModel, BoardModel  # 修正 BoardModel 导入路径
from applications.models.user import UserModel
from applications.extentions import csrf, db

bp = Blueprint('front', __name__)  # 修改蓝图名称为 bp 以匹配 __init__.py 中的导入


@bp.route('/')
def index():
    page = request.args.get('page', type=int, default=1)
    board_id = request.args.get('board_id', type=int, default=0)
    search = request.args.get('search', type=str, default='')
    is_hot = request.args.get('hot', type=int, default=0)  # 添加热门标识参数
    start = (page - 1) * 10
    end = start + 10

    query_obj = PostModel.query.join(BoardModel, PostModel.board_id == BoardModel.id).filter(
        PostModel.is_active == True, BoardModel.is_active == True
    )  # 只查询活跃的帖子和活跃板块的帖子

    if search:
        query_obj = query_obj.filter(
            PostModel.title.contains(search) | PostModel.content.contains(search)
        )
    if board_id:
        # 添加检查板块是否活跃的条件
        board = BoardModel.query.get(board_id)
        if board and board.is_active:
            query_obj = query_obj.filter(PostModel.board_id == board_id)
        else:
            # 如果板块不存在或不活跃，返回空结果
            query_obj = query_obj.filter(PostModel.id == -1)  # 一个不存在的ID
    if is_hot:
        # 如果是热门模式，按浏览量降序排序
        posts = query_obj.order_by(PostModel.read_count.desc()).slice(start, end)
    else:
        # 否则按创建时间降序排序
        posts = query_obj.order_by(PostModel.create_time.desc()).slice(start, end)
    total = query_obj.count()
    boards = BoardModel.query.filter_by(is_active=True).all()  # 只查询活跃的板块

    # 社区统计（只统计活跃的数据）
    total_posts = PostModel.query.join(BoardModel, PostModel.board_id == BoardModel.id).filter(
        PostModel.is_active == True, BoardModel.is_active == True
    ).count()
    total_users = UserModel.query.count()
    total_comments = CommentModel.query.filter_by(is_active=True).count()

    from datetime import datetime
    today = datetime.now().date()
    today_posts = PostModel.query.join(BoardModel, PostModel.board_id == BoardModel.id).filter(
        PostModel.create_time >= today, PostModel.is_active == True, BoardModel.is_active == True
    ).count()

    # 查询浏览量前三的热门帖子
    hot_posts = PostModel.query.join(BoardModel, PostModel.board_id == BoardModel.id).filter(PostModel.is_active==True, BoardModel.is_active==True).order_by(PostModel.read_count.desc()).limit(3).all()

    # 热门标签（使用动态生成的热门标签，只从活跃帖子中提取，移除HTML标签）      
    import re
    from collections import Counter
    keywords = []
    all_posts = PostModel.query.join(BoardModel, PostModel.board_id == BoardModel.id).filter(PostModel.is_active==True, BoardModel.is_active==True).all()  # 只获取活跃帖子
    
    # 移除HTML标签的函数
    def remove_html_tags(text):
        return re.sub(r'<[^>]+>', '', text)
    
    for post in all_posts:
        # 移除HTML标签后再提取关键词
        clean_title = remove_html_tags(post.title)
        clean_content = remove_html_tags(post.content[:200])  # 仅从内容前200字符提取
        
        # 从帖子标题和内容中提取关键词
        words = re.findall(r'[\u4e00-\u9fff]{2,}|\w{2,}', clean_title)  # 提取中文词语（至少2个字符）和英文单词（至少2个字符）
        words += re.findall(r'[\u4e00-\u9fff]{2,}|\w{2,}', clean_content)
        # 移除了板块名称的添加
        
        keywords.extend([word.strip() for word in words if len(word.strip()) >= 2])
    
    keyword_counts = Counter(keywords)
    top_keywords = [keyword for keyword, count in keyword_counts.most_common(10)]
    
    # 如果关键词不足，补充默认标签
    if len(top_keywords) < 10:
        default_tags = ["Python", "Web开发", "机器学习", "前端设计", "数据库", "项目分享", "新手入门", "技术讨论", "开源项目", "教程"]
        for tag in default_tags:
            if tag not in top_keywords:
                top_keywords.append(tag)
            if len(top_keywords) >= 10:
                break
    
    hot_tags = top_keywords[:10]

    pagination = Pagination(
        page=page, 
        total=total, 
        per_page=10, 
        css_framework='bootstrap4',
        show_single_page=True
    )

    return render_template('front/index.html',
                           posts=posts,
                           boards=boards,
                           pagination=pagination,
                           total_posts=total_posts,
                           total_users=total_users,
                           total_comments=total_comments,
                           today_posts=today_posts,
                           hot_tags=hot_tags,
                           hot_posts=hot_posts)


@bp.route('/upload/image', methods=['POST'])
@csrf.exempt
def upload_image():
    f = request.files.get('image')
    filename = f.filename
    from uuid import uuid4
    new_filename = str(uuid4()) + '.' + filename.rsplit('.', 1)[1]
    f.save('static/images/' + new_filename)
    return jsonify({
        'errno': 0,
        'data': [
            {"url": url_for('media.media_file', filename=new_filename)}
        ]
    })


@bp.route('/public_comment', methods=['POST'])  
def public_comment():
    import traceback
    print("=== Debug public_comment ===")
    print(f"request.form: {request.form}")
    print(f"request.args: {request.args}")
    content = request.form.get('content')
    post_id = request.form.get('post_id') or request.args.get('post_id')
    print(f"post_id: {post_id}, type: {type(post_id)}")
    if not content:
        return jsonify({'code': 400, 'message': '内容不能为空'})
    if not post_id:
        print("Error: post_id is empty!")
        return jsonify({'code': 400, 'message': '缺少 post_id 参数'})
    try:
        post_id_int = int(post_id)
        print(f"post_id_int: {post_id_int}")
    except Exception as e:
        print(f"Error converting post_id: {e}")
        print(traceback.format_exc())
        return jsonify({'code': 400, 'message': 'post_id 参数格式错误'})
    
    from datetime import datetime
    comment = CommentModel(content=content, post_id=post_id_int, author_id=current_user.id, create_time=datetime.now())
    db.session.add(comment)
    db.session.commit()
    
    # 添加帖子评论通知
    from applications.utils.notification import create_notification
    from applications.models.notification import NotificationType
    from applications.models.post import PostModel
    
    # 获取帖子信息
    post = PostModel.query.join(BoardModel, PostModel.board_id == BoardModel.id).filter(
        PostModel.id == post_id_int, PostModel.is_active == True, BoardModel.is_active == True
    ).first()
    if post and post.author_id != current_user.id:  # 不向自己发送通知
        create_notification(
            user_id=post.author_id,
            sender_id=current_user.id,
            notify_type=NotificationType.POST_COMMENT,
            content=f"用户{current_user.username}评论了你的帖子",
            related_id=comment.id,
            related_type="comment",
            related_post_id=post_id_int
        )
    
    print(f"Redirecting to: post.post_detail with post_id={post_id_int}")
    return redirect(url_for('post.post_detail', post_id=post_id_int))
