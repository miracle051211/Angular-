from applications.extentions.init_sqlalchemy import db
from datetime import datetime
from sqlalchemy import func

# 板块模型
class BoardModel(db.Model):
    __tablename__ = "board"
    id = db.Column(db.Integer, primary_key = True, autoincrement = True)
    name = db.Column(db.String(20), nullable = False)
    create_time = db.Column(db.DateTime, default = datetime.now)
    is_active = db.Column(db.Boolean, default = True)

# 帖子模型
class PostModel(db.Model):
    __tablename__ = "post"
    id = db.Column(db.Integer, primary_key = True, autoincrement = True)
    title = db.Column(db.String(200), nullable = False)
    content = db.Column(db.Text, nullable = False)
    create_time = db.Column(db.DateTime, default = datetime.now)
    read_count = db.Column(db.Integer, default = 0)
    is_active = db.Column(db.Boolean, default = True)
    
    board_id = db.Column(db.Integer, db.ForeignKey("board.id"))
    author_id = db.Column(db.String(100), db.ForeignKey("user.id"), nullable = False)

    board = db.relationship("BoardModel", backref = "posts")
    author = db.relationship("UserModel", backref = "posts")
    
    def is_liked_by(self, user):
        """检查指定用户是否已点赞该帖子"""
        if not user or not user.is_authenticated:
            return False
        return LikeModel.query.filter_by(user_id=user.id, post_id=self.id).first() is not None
    
    def like_count(self):
        """获取帖子的点赞数量"""
        return LikeModel.query.filter_by(post_id=self.id).count()
    
    def comment_count(self):
        """获取帖子的评论数量"""
        return CommentModel.query.filter_by(post_id=self.id, is_active=True).count()

# 点赞模型
class LikeModel(db.Model):
    __tablename__ = "likes"
    id = db.Column(db.Integer, primary_key = True, autoincrement = True)
    create_time = db.Column(db.DateTime, default = datetime.now)
    
    # 用户ID（加密字符串）
    user_id = db.Column(db.String(100), db.ForeignKey("user.id"), nullable = False)
    # 帖子ID（可选）
    post_id = db.Column(db.Integer, db.ForeignKey("post.id"), nullable = True)
    # 评论ID（可选）
    comment_id = db.Column(db.Integer, db.ForeignKey("comment.id"), nullable = True)
    
    # 关系
    user = db.relationship("UserModel", backref = "likes")
    post = db.relationship("PostModel", backref = db.backref('likes', lazy = "dynamic"))
    comment = db.relationship("CommentModel", backref = db.backref('likes', lazy = "dynamic"))
    
    # 确保用户不能重复点赞同一个帖子或评论
    __table_args__ = (
        db.UniqueConstraint('user_id', 'post_id', name='_user_post_like_uc'),
        db.UniqueConstraint('user_id', 'comment_id', name='_user_comment_like_uc'),
    )

# 举报模型
class ReportModel(db.Model):
    __tablename__ = "report"
    id = db.Column(db.Integer, primary_key = True, autoincrement = True)
    reason = db.Column(db.Text, nullable = False)
    create_time = db.Column(db.DateTime, default = datetime.now)
    is_handled = db.Column(db.Boolean, default = False)
    
    # 用户ID（加密字符串）
    user_id = db.Column(db.String(100), db.ForeignKey("user.id"), nullable = False)
    # 帖子ID（可选）
    post_id = db.Column(db.Integer, db.ForeignKey("post.id"), nullable = True)
    # 评论ID（可选）
    comment_id = db.Column(db.Integer, db.ForeignKey("comment.id"), nullable = True)
    
    # 关系
    user = db.relationship("UserModel", backref = "reports")
    post = db.relationship("PostModel", backref = db.backref('reports', lazy = "dynamic"))
    comment = db.relationship("CommentModel", backref = db.backref('reports', lazy = "dynamic"))

# 评论模型
class CommentModel(db.Model):
    __tablename__ = "comment"
    id = db.Column(db.Integer, primary_key = True, autoincrement = True)
    content = db.Column(db.Text, nullable = False)
    create_time = db.Column(db.DateTime, default = datetime.now)
    is_active = db.Column(db.Boolean, default = True)
    
    post_id = db.Column(db.Integer, db.ForeignKey("post.id"))
    # 注意user.id是加密过的字符串形式
    author_id = db.Column(db.String(100), db.ForeignKey("user.id"))
    # 回复的评论ID（可选，用于实现回复功能）
    parent_id = db.Column(db.Integer, db.ForeignKey("comment.id"), nullable = True)
    
    # 关系
    post = db.relationship("PostModel", backref = db.backref('comments', order_by = create_time.desc(), lazy = "dynamic"))
    author = db.relationship("UserModel", backref = "comments")
    # 回复的评论
    parent = db.relationship("CommentModel", remote_side=[id], backref = db.backref('replies', order_by = create_time.desc(), lazy = "dynamic"))
    
    def is_liked_by(self, user):
        """检查指定用户是否已点赞该评论"""
        if not user or not user.is_authenticated:
            return False
        return LikeModel.query.filter_by(user_id=user.id, comment_id=self.id).first() is not None
    
    def like_count(self):
        """获取评论的点赞数量"""
        return LikeModel.query.filter_by(comment_id=self.id).count()
    
    def is_reply(self):
        """检查该评论是否是回复"""
        return self.parent_id is not None
    
    def reply_count(self):
        """获取该评论的回复数量"""
        return CommentModel.query.filter_by(parent_id=self.id, is_active=True).count()