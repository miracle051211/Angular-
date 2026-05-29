from applications.models import NotificationModel, NotificationType, UserModel
from applications.extentions.init_sqlalchemy import db
from applications.extentions.init_mail import mail
from flask_mail import Message
from flask import current_app

def create_notification(
    user_id: str,
    sender_id: str,
    notify_type: NotificationType,
    content: str,
    related_id: int = None,
    related_type: str = None,
    related_post_id: int = None
):
    """
    创建新通知
    
    Args:
        user_id: 接收通知的用户ID
        sender_id: 发送通知的用户ID
        notify_type: 通知类型
        content: 通知内容
        related_id: 相关资源ID（如帖子ID、评论ID）
        related_type: 相关资源类型
    """
    # 获取用户的通知偏好
    user = UserModel.query.get(user_id)
    if not user:
        return
    
    # 根据通知类型检查用户是否启用了该类型的通知
    if notify_type == NotificationType.POST_LIKE and not user.notify_post_like:
        return
    if notify_type == NotificationType.COMMENT_REPLY and not user.notify_comment_reply:
        return
    if notify_type == NotificationType.NEW_MESSAGE and not user.notify_new_message:
        return
    if notify_type == NotificationType.COMMENT_LIKE and not user.notify_comment_like:
        return
    # 添加帖子评论通知的偏好检查
    if hasattr(user, 'notify_post_comment') and not user.notify_post_comment:
        return
    
    # 创建通知
    notification = NotificationModel(
        user_id=user_id,
        sender_id=sender_id,
        type=notify_type.value,
        content=content,
        related_id=related_id,
        related_type=related_type,
        related_post_id=related_post_id
    )
    
    db.session.add(notification)
    db.session.commit()
    
    # 发送邮件通知（如果用户启用了）
    if user.receive_email_notifications:
        send_email_notification(user, notification)
    
    return notification



def send_email_notification(user, notification):
    """
    发送邮件通知给用户
    
    Args:
        user: UserModel对象
        notification: NotificationModel对象
    """
    try:
        subject = f"【学习小洞天】{notification.type}"
        
        # 创建邮件内容
        body = f"尊敬的用户 {user.username}：\n\n"
        body += f"您有一条新的{notification.type}：\n"
        body += f"{notification.content}\n\n"
        body += f"时间：{notification.create_time.strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        
        # 添加查看链接
        if notification.related_id and notification.related_type == 'post':
            body += f"您可以点击以下链接查看详情：\n"
            body += f"{current_app.config.get('SITE_URL')}/post/{notification.related_id}\n\n"
        elif notification.related_id and notification.related_type == 'comment':
            body += f"您可以点击以下链接查看详情：\n"
            body += f"{current_app.config.get('SITE_URL')}/post/{notification.related_post_id}\n\n"
        
        body += "您可以登录系统查看所有通知，或在设置中关闭邮件通知。\n\n"
        body += "学习小洞天团队"
        
        # 创建并发送邮件
        message = Message(
            subject=subject,
            recipients=[user.email],
            body=body
        )
        
        mail.send(message)
        
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send email notification to user {user.id}: {str(e)}")
        return False