from wtforms import StringField, ValidationError, BooleanField, FileField
from wtforms.validators import Email, EqualTo, Length
from applications.models.user import UserModel
from applications.models.captcha import CaptchaModel
from .baseform import BaseForm
from flask_wtf.file import FileAllowed
from datetime import datetime

class RegisterForm(BaseForm):
    email = StringField(validators = [Email(message = "请输入正确邮箱!")])
    email_captcha = StringField(validators = [Length(min = 4, max = 4, message = "请输入四位数验证码!")])
    username = StringField(validators = [Length(min = 2, max = 7, message = "用户名长度为2~7!")])
    password = StringField(validators = [Length(min = 6, max = 20, message = "密码格式为6~20位!")])
    confirm_password = StringField(validators = [EqualTo("password", message = "两次密码不一致!")])

    def validate_email(self, field):
        email = field.data
        user = UserModel.query.filter_by(email = email).first()
        if user:
            raise ValidationError(message = "邮箱已存在")
        
    def validate_email_captcha(self, field):
        # 这个方法不再抛出ValidationError
        # 只是验证验证码是否正确，返回结果或存储在实例变量中
        pass
        
    def validate_captcha(self):
        """自定义验证码验证方法，不通过WTForms的ValidationError系统"""
        captcha = self.email_captcha.data
        email = self.email.data
        # 从数据库获取最新的注册验证码
        captcha_model = CaptchaModel.query.filter_by(email=email, type="register").order_by(CaptchaModel.created_at.desc()).first()
        if not captcha_model:
            return False, "验证码不存在!"
        if datetime.now() > captcha_model.expired_at:
            return False, "验证码已过期!"
        if captcha != captcha_model.captcha:
            return False, "验证码错误!"
        return True, ""

class LoginForm(BaseForm):
    email = StringField(validators = [Email(message = "请输入正确格式的邮箱!")])
    password = StringField(validators = [Length(min = 6, max = 20, message = "请输入正确长度的密码!")])
    remember = BooleanField()

class EditProfileForm(BaseForm):
    username = StringField(validators = [Length(min = 2, max = 20, message = "请输入正确格式的用户名!")])
    avatar = FileField(validators = [FileAllowed(['jpg', 'jpeg', 'png'], message = "文件类型错误!")])
    signature = StringField()

    def validate_signature(self, field):
        signature = field.data
        if signature and len(signature) > 100:
            raise ValidationError(message = '签名不能超过100个字符')
        
class FindPasswordForm(BaseForm):
    email = StringField(validators = [Email(message = "请输入正确格式的邮箱!")])
    email_captcha = StringField(validators = [Length(min = 4, max = 4, message = "请输入四位数验证码!")])
    password = StringField(validators = [Length(min = 6,max = 20, message = "密码长度为6~20位!")])
    confirm_password = StringField(validators = [EqualTo("password", message = "两次密码输入不一致!")])

    def validate_email_captcha(self, field):
        # 这个方法不再抛出ValidationError
        pass
        
    def validate_captcha(self):
        """自定义验证码验证方法，不通过WTForms的ValidationError系统"""
        captcha = self.email_captcha.data
        email = self.email.data
        # 从数据库获取最新的密码找回验证码
        captcha_model = CaptchaModel.query.filter_by(email=email, type="reset").order_by(CaptchaModel.created_at.desc()).first()
        if not captcha_model:
            return False, "验证码不存在!"
        if datetime.now() > captcha_model.expired_at:
            return False, "验证码已过期!"
        if captcha != captcha_model.captcha:
            return False, "验证码错误!"
        return True, ""

class SettingsForm(BaseForm):
    # 基本信息
    signature = StringField()
    
    # 隐私设置
    is_profile_public = BooleanField()
    show_email = BooleanField()
    
    # 通知设置
    notify_new_message = BooleanField()
    notify_comment_reply = BooleanField()
    notify_post_like = BooleanField()
    notify_comment_like = BooleanField()
    receive_email_notifications = BooleanField()
    
    def validate_signature(self, field):
        signature = field.data
        if signature and len(signature) > 100:
            raise ValidationError(message = '签名不能超过100个字符')

class PasswordChangeForm(BaseForm):
    current_password = StringField(validators = [Length(min = 6, max = 20, message = "密码格式为6~20位!")])
    new_password = StringField(validators = [Length(min = 6, max = 20, message = "密码格式为6~20位!")])
    confirm_password = StringField(validators = [EqualTo("new_password", message = "两次密码不一致!")])