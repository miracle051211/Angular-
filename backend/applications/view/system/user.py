from flask import Blueprint, request ,render_template, redirect, url_for, flash, session, g
from flask_login import login_user, logout_user, login_required
from applications.extentions.init_sqlalchemy import db
from flask_mail import Message
from applications.extentions.init_mail import mail

import random
from flask import current_app
from applications.common.utils import restful
from applications.forms.user import RegisterForm, LoginForm, EditProfileForm, FindPasswordForm, SettingsForm, PasswordChangeForm
from applications.models.user import UserModel
from applications.models import NotificationModel, NotificationType, MessageModel
from applications.models.captcha import CaptchaModel
from werkzeug.datastructures import CombinedMultiDict
from werkzeug.utils import secure_filename
import os
import base64
from io import BytesIO
from applications.utils.notification import create_notification

bp = Blueprint("user", __name__, url_prefix = "/user")

@bp.route("/mail/captcha0")
def mail_captcha0():
    try:
        email = request.args.get("mail")
        
        digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
        captcha = "".join(random.sample(digits, 4))
        body = f"【学习小洞天】您的注册验证码是：{captcha}，请勿告诉他人！"
        subject = "【学习小洞天】注册验证码"
        message = Message(subject = subject, recipients = [email], body = body)

        mail.send(message)
        # 删除该邮箱之前的所有注册验证码
        CaptchaModel.query.filter_by(email=email, type="register").delete()
        # 将验证码存储到数据库中
        captcha_model = CaptchaModel(email=email, captcha=captcha, type="register")
        db.session.add(captcha_model)
        db.session.commit()
        return restful.ok()
    except Exception as e:
        print(e)
        return restful.server_error()
@bp.route("/mail/captcha1")
def mail_captcha1():
    try:
        email = request.args.get("mail")
        user = UserModel.query.filter_by(email = email).first()
        if not user:
            return restful.params_error(message = "该邮箱未注册")
        digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
        captcha = "".join(random.sample(digits, 4))
        body = f"【学习小洞天】您的密码找回验证码是：{captcha}，请勿告诉他人！"
        subject = "【学习小洞天】密码找回验证码"
        message = Message(subject = subject, recipients = [email], body = body)
        mail.send(message)
        # 删除该邮箱之前的所有密码找回验证码
        CaptchaModel.query.filter_by(email=email, type="reset").delete()
        # 将验证码存储到数据库中
        captcha_model = CaptchaModel(email=email, captcha=captcha, type="reset")
        db.session.add(captcha_model)
        db.session.commit()
        return restful.ok()
    except Exception as e:
        print(e)
        return restful.server_error()
    
@bp.route("/register", methods = ['GET', 'POST'])
def register():
    if request.method == 'GET':
        return render_template("front/register.html")
    else:
        form = RegisterForm(request.form)
        if form.validate():
            # 验证基本信息通过后，额外验证验证码
            captcha_valid, captcha_msg = form.validate_captcha()
            if captcha_valid:
                email = form.email.data
                username = form.username.data
                password = form.password.data
                user = UserModel(email = email, username = username, password = password)
                db.session.add(user)
                db.session.commit()
                return redirect(url_for("user.login"))
            else:
                flash(captcha_msg, "danger")
                return redirect(url_for("user.register"))
        else:
            for message in form.messages:
                flash(message, "danger")
            return redirect(url_for("user.register"))
        
@bp.route("/login", methods = ["GET", "POST"])
def login():
    if request.method == "GET":
        return render_template("front/login.html")
    else:
        form = LoginForm(request.form)
        if form.validate():
            email = form.email.data
            password = form.password.data
            remember = form.remember.data
            user = UserModel.query.filter_by(email = email).first()
            if user and user.check_password(password):
                if not user.is_active:
                    flash("该用户已被禁用！", "danger")
                    return redirect(url_for("user.login"))
                login_user(user, remember=remember)
                return redirect("/")
            else:
                flash("邮箱或者密码错误!", "danger")
                return redirect(url_for("user.login"))
        else:
            for message in form.messages:
                    flash(message, "danger")
            return render_template("front/login.html")

@bp.get("/profile/<string:user_id>")
def profile(user_id):
    user = UserModel.query.get(user_id)
    is_mine = False
    if hasattr(g, "user") and g.user.id == user.id:
        is_mine = True
    
    # 隐私检查: 非本人且资料不公开则拒绝访问
    if not is_mine and not user.is_profile_public:
        flash("该用户已设置个人资料私密", "warning")
        return redirect(url_for("front.index"))
        
    context = {
        "user": user,
        "is_mine": is_mine
    }
    return render_template("front/profile.html", **context)
                
@bp.get("/logout")
def logout():
    logout_user()
    return redirect("/")

@bp.get("/notifications")
@login_required
def notifications():
    """
    通知中心
    """
    # 获取用户的所有通知，按创建时间倒序排列
    notifications = NotificationModel.query.filter_by(user_id=g.user.id).order_by(NotificationModel.create_time.desc()).all()
    
    # 获取未读通知数量
    unread_count = NotificationModel.query.filter_by(user_id=g.user.id, is_read=False).count()
    
    context = {
        "notifications": notifications,
        "unread_count": unread_count
    }
    
    return render_template("front/notifications.html", **context)

@bp.get("/notifications/mark-read/<int:notification_id>")
@login_required
def mark_notification_read(notification_id):
    """
    标记通知为已读
    """
    notification = NotificationModel.query.filter_by(id=notification_id, user_id=g.user.id).first()
    if notification:
        notification.is_read = True
        db.session.commit()
        flash("通知已标记为已读", "success")
    return redirect(url_for("user.notifications"))

@bp.get("/notifications/mark-all-read")
@login_required
def mark_all_notifications_read():
    """标记所有通知为已读"""
    notifications = NotificationModel.query.filter_by(user_id=g.user.id, is_read=False).all()
    for notification in notifications:
        notification.is_read = True
    db.session.commit()
    flash("所有通知已标记为已读", "success")
    return redirect(url_for("user.notifications"))

@bp.get("/notifications/clear-all")
@login_required
def clear_all_notifications():
    """清除所有通知"""
    NotificationModel.query.filter_by(user_id=g.user.id).delete()
    db.session.commit()
    flash("所有通知已清除", "success")
    return redirect(url_for("user.notifications"))

@bp.route("/profile/edit", methods=['GET', 'POST'])
@login_required
def edit_profile():
    # 对于裁剪头像的处理，我们需要绕过WTForms的文件验证
    # 因为裁剪后通过隐藏字段提交，而不是文件上传
    cropped_avatar = request.form.get('cropped_avatar')
    
    if cropped_avatar:
        # 如果有裁剪头像数据，我们直接处理，不使用完整的表单验证
        username = request.form.get('username', g.user.username)
        signature = request.form.get('signature', g.user.signature)
        
        # 移除base64头部
        if cropped_avatar.startswith('data:image/'):
            cropped_avatar = cropped_avatar.split(',')[1]
        # 解码base64数据
        avatar_data = base64.b64decode(cropped_avatar)
        
        # 生成唯一文件名
        import uuid
        filename = str(uuid.uuid4()) + '.jpg'
        # 确保使用绝对路径保存文件
        avatars_save_path = current_app.config.get("AVATARS_SAVE_PATH")
        if not os.path.isabs(avatars_save_path):
            avatars_save_path = os.path.join(current_app.root_path, avatars_save_path)
        # 确保目录存在
        if not os.path.exists(avatars_save_path):
            os.makedirs(avatars_save_path)
        avatar_path = os.path.join(avatars_save_path, filename)
        
        # 保存文件
        with open(avatar_path, 'wb') as f:
            f.write(avatar_data)
        
        # 设置头像URL
        g.user.avatar = url_for("media.media_file", filename = "avatars/" + filename)
        
        # 更新用户信息
        g.user.username = username
        g.user.signature = signature
        db.session.commit()
        flash("个人资料保存成功", "success")
        return redirect(url_for("user.profile", user_id = g.user.id))
    
    # 常规表单处理（没有裁剪头像时）
    form = EditProfileForm(CombinedMultiDict([request.form, request.files]))
    if form.validate():
        username = form.username.data
        avatar = form.avatar.data
        signature = form.signature.data
        
        # 处理普通上传的头像
        if avatar:
            import uuid
            filename = str(uuid.uuid4()) + '.' + avatar.filename.split('.')[-1]
            # 确保使用绝对路径保存文件
            avatars_save_path = current_app.config.get("AVATARS_SAVE_PATH")
            if not os.path.isabs(avatars_save_path):
                avatars_save_path = os.path.join(current_app.root_path, avatars_save_path)
            # 确保目录存在
            if not os.path.exists(avatars_save_path):
                os.makedirs(avatars_save_path)
            avatar_path = os.path.join(avatars_save_path, filename)
            avatar.save(avatar_path)
            g.user.avatar = url_for("media.media_file", filename = "avatars/" + filename)

        g.user.username = username
        g.user.signature = signature
        db.session.commit()
        flash("个人资料保存成功", "success")
        return redirect(url_for("user.profile", user_id = g.user.id))
    else:
        for message in form.messages:
            flash(message, "danger")
        return redirect(url_for("user.profile", user_id = g.user.id))
    
@bp.route("/find_password", methods = ["GET", "POST"])
def find_password():
    if request.method == "GET":
        return render_template("front/password.html")
    else:
        form = FindPasswordForm(request.form)
        if form.validate():
            # 验证基本信息通过后，额外验证验证码
            captcha_valid, captcha_msg = form.validate_captcha()
            if captcha_valid:
                email = form.email.data
                if not email:
                    return restful.params_error(message="邮箱不能为空")
                password = form.password.data
                user = UserModel.query.filter_by(email = email).first()
                # 使用check_password方法验证新旧密码是否一致
                if user.check_password(password):
                    flash("不得与原密码一致!", "danger")
                    return render_template("front/password.html")
                # 使用UserModel的password属性setter自动进行哈希处理
                user.password = password
                db.session.commit()
                return redirect(url_for('user.login'))
            else:
                flash(captcha_msg, "danger")
                return redirect(url_for("user.find_password"))
        else:
            for message in form.messages:
                flash(message, "danger")
            return redirect(url_for("user.find_password"))

@bp.route('/settings', methods=['GET', 'POST'])
@login_required
def settings():
    from applications.forms.user import SettingsForm, PasswordChangeForm
    
    print('== Entering settings view function ==')
    print('Request method:', request.method)
    print('User:', g.user.username if hasattr(g, 'user') else 'No user in g')
    
    # 直接从数据库获取用户对象
    user = UserModel.query.get(g.user.id) if hasattr(g, 'user') else None
    if not user:
        flash('用户未找到', 'danger')
        return redirect(url_for('user.login'))
    
    if request.method == 'GET':
        print('GET request - Initializing form with user data')
        form = SettingsForm(data={
            'signature': user.signature,
            'is_profile_public': user.is_profile_public,
            'show_email': user.show_email,
            'notify_new_message': user.notify_new_message,
            'notify_comment_reply': user.notify_comment_reply,
            'notify_post_like': user.notify_post_like,
            'notify_comment_like': user.notify_comment_like,
            'receive_email_notifications': user.receive_email_notifications
        })
        password_form = PasswordChangeForm()
        print('Form initialized with user data')
        print('Form signature:', form.signature.data)
        print('Form is_profile_public:', form.is_profile_public.data)
        print('Form show_email:', form.show_email.data)
        return render_template('front/settings.html', form=form, password_form=password_form)
    else:
        print('POST request received')
        if 'signature' in request.form or 'is_profile_public' in request.form or 'show_email' in request.form or 'notify_new_message' in request.form or 'notify_comment_reply' in request.form or 'notify_post_like' in request.form or 'notify_comment_like' in request.form or 'receive_email_notifications' in request.form:
            print('Settings update POST request')
            print('Submitted fields:', list(request.form.keys()))

            # 更新个性签名
            if 'signature' in request.form:
                signature = request.form.get('signature')
                if len(signature) > 100:
                    flash('个性签名不能超过100个字符', 'danger')
                    return redirect(url_for('user.settings'))
                user.signature = signature
                print('Updated signature:', user.signature)
            
            # 关键：我们需要查看提交的字段中有哪些复选框字段
            # 首先确定表单可能包含哪些复选框字段，根据模板
            checkbox_fields = {
                'is_profile_public': False,
                'show_email': False,
                'notify_new_message': False,
                'notify_comment_reply': False,
                'notify_post_like': False,
                'notify_comment_like': False,
                'receive_email_notifications': False
            }
            
            # 确定哪些复选框字段在这个请求中被提交了
            # 检查表单键中是否有任何复选框字段
            # 注意：这是一个POST请求，所以所有包含的字段都是被用户操作的
            has_checkbox_fields = any(field in request.form for field in checkbox_fields.keys())
            
            if has_checkbox_fields:
                print('Processing checkbox fields')
                # 对于在当前POST请求中存在的所有复选框字段，我们需要更新它们
                # 因为表单被组织为选项卡，每个选项卡的表单只包含该选项卡中的字段
                # 例如：当用户提交通知设置时，表单中只有通知相关的复选框字段
                # 所以我们需要确定哪些复选框字段在当前POST中，然后只更新这些字段
                present_fields = [field for field in checkbox_fields.keys() if field in request.form]
                print('Present checkbox fields:', present_fields)
                
                for field in checkbox_fields.keys():
                    # 只有当这个字段出现在当前POST中时，我们才更新它的值
                    if field in present_fields:
                        # 复选框被勾选，设置为True
                        setattr(user, field, True)
                        print(f'Set {field} to True')
                    else:
                        # 复选框在当前POST中存在的组中，但未被勾选，设置为False
                        # 例如：用户在通知设置表单中取消了某个通知
                        # 我们需要检查这个字段是否是当前表单组中的字段
                        # 要做到这一点，我们可以查看表单中存在的复选框属于哪个组
                        # 隐私设置组：is_profile_public, show_email
                        # 通知设置组：notify_*, receive_email_notifications
                        privacy_fields = ['is_profile_public', 'show_email']
                        notification_fields = ['notify_new_message', 'notify_comment_reply', 'notify_post_like', 'notify_comment_like', 'receive_email_notifications']
                        
                        # 检查当前POST中是否有任何隐私字段
                        has_privacy_fields = any(f in present_fields for f in privacy_fields)
                        has_notification_fields = any(f in present_fields for f in notification_fields)
                        
                        # 如果当前POST有隐私字段，且这个字段属于隐私字段组，但不在当前POST中
                        if has_privacy_fields and field in privacy_fields:
                            setattr(user, field, False)
                            print(f'Set {field} to False (privacy group)')
                        # 如果当前POST有通知字段，且这个字段属于通知字段组，但不在当前POST中
                        if has_notification_fields and field in notification_fields:
                            setattr(user, field, False)
                            print(f'Set {field} to False (notification group)')
            
            db.session.commit()
            flash('设置保存成功', 'success')
            return redirect(url_for('user.settings'))
        elif 'current_password' in request.form:
            print('Password change POST request')
            password_form = PasswordChangeForm(request.form)
            if password_form.validate():
                # 验证当前密码
                current_password = password_form.current_password.data
                if not user.check_password(current_password):
                    flash("当前密码错误", "danger")
                    return redirect(url_for("user.settings"))
                
                # 更新新密码
                new_password = password_form.new_password.data
                user.password = new_password
                db.session.commit()
                flash("密码修改成功", "success")
                return redirect(url_for("user.settings"))
            else:
                for message in password_form.messages:
                    flash(message, "danger")
                return redirect(url_for("user.settings"))
        else:
            # 设置更新请求 - 手动处理只更新提交的字段
            # 处理签名
            if 'signature' in request.form:
                signature = request.form['signature']
                if len(signature) > 100:
                    flash('签名不能超过100个字符', 'danger')
                    return redirect(url_for('user.settings'))
                user.signature = signature
            # 处理隐私设置
            if 'is_profile_public' in request.form:
                user.is_profile_public = True
            elif 'is_profile_public' not in request.form:
                user.is_profile_public = False
            if 'show_email' in request.form:
                user.show_email = True
            elif 'show_email' not in request.form:
                user.show_email = False
            # 处理通知设置
            if 'notify_new_message' in request.form:
                user.notify_new_message = True
            elif 'notify_new_message' not in request.form:
                user.notify_new_message = False
            if 'notify_comment_reply' in request.form:
                user.notify_comment_reply = True
            elif 'notify_comment_reply' not in request.form:
                user.notify_comment_reply = False
            if 'notify_post_like' in request.form:
                user.notify_post_like = True
            elif 'notify_post_like' not in request.form:
                user.notify_post_like = False
            if 'notify_comment_like' in request.form:
                user.notify_comment_like = True
            elif 'notify_comment_like' not in request.form:
                user.notify_comment_like = False
            if 'receive_email_notifications' in request.form:
                user.receive_email_notifications = True
            elif 'receive_email_notifications' not in request.form:
                user.receive_email_notifications = False
            db.session.commit()
            flash('设置保存成功', 'success')
            return redirect(url_for('user.settings'))

@bp.route("/messages")
@login_required
def messages():
    """
    私信列表
    """
    # 获取用户收到的所有私信，按创建时间倒序排列
    messages = MessageModel.query.filter_by(receiver_id=g.user.id).order_by(MessageModel.create_time.desc()).all()
    
    # 获取未读私信数量
    unread_count = MessageModel.query.filter_by(receiver_id=g.user.id, is_read=False).count()
    
    context = {
        "messages": messages,
        "unread_count": unread_count
    }
    
    return render_template("front/messages.html", **context)


@bp.route("/messages/send", methods=["GET", "POST"])
@login_required
def send_message():
    """
    发送私信
    """
    if request.method == "GET":
        # 获取要发送的用户ID（可选）
        receiver_id = request.args.get("receiver_id")
        receiver = UserModel.query.get(receiver_id) if receiver_id else None
        # 获取所有用户列表（排除当前用户）
        users = UserModel.query.filter(UserModel.id != g.user.id).all()
        return render_template("front/send_message.html", receiver=receiver, users=users)
    else:
        receiver_id = request.form.get("receiver_id")
        content = request.form.get("content")
        
        if not receiver_id or not content:
            flash("收件人和内容不能为空", "danger")
            return redirect(url_for("user.send_message", receiver_id=receiver_id))
        
        receiver = UserModel.query.get(receiver_id)
        if not receiver:
            flash("收件人不存在", "danger")
            return redirect(url_for("user.send_message"))
        
        # 创建消息
        message = MessageModel(sender_id=g.user.id, receiver_id=receiver_id, content=content)
        db.session.add(message)
        db.session.commit()
        
        # 创建新消息通知
        create_notification(
            user_id=receiver_id,
            sender_id=g.user.id,
            notify_type=NotificationType.NEW_MESSAGE,
            content=f"您收到来自{current_app.config.get('SITE_NAME', '学习小洞天')}用户{g.user.username}的新消息",
            related_id=message.id,
            related_type="message"
        )
        
        flash("消息发送成功", "success")
        return redirect(url_for("user.messages"))


@bp.get("/messages/<int:message_id>")
@login_required
def view_message(message_id):
    """
    查看私信详情
    """
    message = MessageModel.query.get(message_id)
    if not message:
        flash("消息不存在", "danger")
        return redirect(url_for("user.messages"))
    
    # 只有发送者或接收者可以查看消息
    if message.sender_id != g.user.id and message.receiver_id != g.user.id:
        flash("无权查看此消息", "danger")
        return redirect(url_for("user.messages"))
    
    # 如果是接收者，标记消息为已读
    if message.receiver_id == g.user.id and not message.is_read:
        message.mark_as_read()
    
    return render_template("front/message_detail.html", message=message)


@bp.get("/messages/mark-read/<int:message_id>")
@login_required
def mark_message_read(message_id):
    """
    标记私信为已读
    """
    message = MessageModel.query.filter_by(id=message_id, receiver_id=g.user.id).first()
    if message:
        message.mark_as_read()
        flash("消息已标记为已读", "success")
    return redirect(url_for("user.messages"))


@bp.get("/messages/mark-all-read")
@login_required
def mark_all_messages_read():
    """标记所有私信为已读"""
    messages = MessageModel.query.filter_by(receiver_id=g.user.id, is_read=False).all()
    for message in messages:
        message.mark_as_read()
    db.session.commit()
    flash("所有私信已标记为已读", "success")
    return redirect(url_for("user.messages"))


@bp.get("/messages/clear-all")
@login_required
def clear_all_messages():
    """清除所有私信"""
    MessageModel.query.filter_by(receiver_id=g.user.id).delete()
    db.session.commit()
    flash("所有私信已清除", "success")
    return redirect(url_for("user.messages"))


@bp.get("/messages/send-to/<string:user_id>")
@login_required
def send_message_to(user_id):
    """
    发送私信给指定用户
    """
    receiver = UserModel.query.get(user_id)
    if not receiver:
        flash("用户不存在")
        return redirect(url_for("user.messages"))
    
    return redirect(url_for("user.send_message", receiver_id=user_id))










