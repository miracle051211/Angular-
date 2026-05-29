from .baseform import BaseForm
from wtforms import StringField, IntegerField, BooleanField
from wtforms.validators import Email, InputRequired, Length

class AddStaffForm(BaseForm):
    email = StringField(validators = [Email(message = "请输入正确格式的邮箱!")])
    role = IntegerField(validators = [InputRequired(message = "请输入正确的角色!")])

class EditStaffForm(BaseForm):
    is_staff = IntegerField(validators = [InputRequired(message = '请选择是否为员工!')])
    role = IntegerField()

class AddBoardForm(BaseForm):
    boardname = StringField(validators = [Length(min = 2, max = 6, message = "请输入2-6位板块名称!")])

class EditBoardForm(BaseForm):
    boardname = StringField(validators = [Length(min = 2, max = 6, message = "请输入2-6位板块名称!")])


    
    
