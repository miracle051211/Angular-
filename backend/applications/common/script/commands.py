# click库实现命令
import click
from flask.cli import AppGroup
from applications.models.user import PermissionEnum, PermissionModel, RoleModel, UserModel
from applications.models.post import BoardModel, PostModel
from applications.extentions.init_sqlalchemy import db
from faker import Faker
import random 


admin_cli = AppGroup("admin")

#添加权限数据
# @app.cli.command("create-permission") 在app.py中手动添加
def create_permission():
    print("正在创建权限数据...")
    for permission_name in dir(PermissionEnum):
        if permission_name.startswith("__"):
            continue
        permission_value = getattr(PermissionEnum, permission_name)
        # 检查是否已存在该权限
        existing = PermissionModel.query.filter_by(name=permission_value).first()
        if not existing:
            permission = PermissionModel(name = permission_value)
            db.session.add(permission)
    db.session.commit()
    click.echo("添加权限成功！")
    print("✓ 权限数据创建成功")

# 自定义命令 添加角色数据
# @app.cli.command("create-role") 在app.py中手动添加
def create_role():
    print("正在创建角色数据...")
    # 稽查：帖子、评论 权限
    if not RoleModel.query.filter_by(name="稽查").first():
        inspector = RoleModel(name = "稽查", desc = "负责审核帖子和评论是否合法合规!")
        inspector.permissions = PermissionModel.query.filter(PermissionModel.name.in_([PermissionEnum.POST, PermissionEnum.COMMENT])).all()
        db.session.add(inspector)

    # 运营: 板块、帖子、评论、前台用户 权限
    if not RoleModel.query.filter_by(name="运营").first():
        operator = RoleModel(name = "运营", desc = "负责网站持续正常运营!")
        operator.permissions = PermissionModel.query.filter(PermissionModel.name.in_([
            PermissionEnum.Board,
            PermissionEnum.POST,
            PermissionEnum.COMMENT,
            PermissionEnum.FRONT_USER
        ])).all()
        db.session.add(operator)

    # 管理员：ALL
    if not RoleModel.query.filter_by(name="管理员").first():
        administrator = RoleModel(name = "管理员", desc = "负责整个网站所有工作！")
        administrator.permissions = PermissionModel.query.all()
        db.session.add(administrator)

    db.session.commit()
    click.echo("角色添加成功!")
    print("✓ 角色数据创建成功")

def create_test_user():
    print("正在创建测试用户...")
    admin_role = RoleModel.query.filter_by(name = "管理员").first()
    if not UserModel.query.filter_by(username="张三").first():
        zhangsan = UserModel(username = "张三", email = "zhangsan@163.com", password = "123456", is_staff = True, role = admin_role)
        db.session.add(zhangsan)

    operator_role = RoleModel.query.filter_by(name = "运营").first()
    if not UserModel.query.filter_by(username="李四").first():
        lisi = UserModel(username = "李四", email = "lisi@163.com", password = "123456", is_staff = True, role = operator_role)
        db.session.add(lisi)

    inspector_role = RoleModel.query.filter_by(name = "稽查").first()
    if not UserModel.query.filter_by(username="王五").first():
        wangwu = UserModel(username = "王五", email = "wangwu@163.com", password = "123456", is_staff = True, role = inspector_role) 
        db.session.add(wangwu)

    db.session.commit()
    click.echo("测试用户添加成功!")
    print("✓ 测试用户创建成功")


def create_board():
    print("正在创建板块...")
    board_names = ["洞天日常", "有问有答", "游戏日报", "惊鸿一瞥"]
    for board_name in board_names:
        if not BoardModel.query.filter_by(name=board_name).first():
            board = BoardModel(name = board_name)
            db.session.add(board)
    db.session.commit()
    click.echo("板块添加成功!")
    print("✓ 板块创建成功")

def create_test_post():
    print("正在创建测试帖子...")
    fake = Faker(locale = "zh_CN")
    author = UserModel.query.first()
    boards = BoardModel.query.all()

    click.echo("开始生成测试帖子...")
    for x in range(98):
        title = fake.sentence()
        content = fake.paragraph(nb_sentences = 10)
        random_index = random.randint(0, len(boards) - 1)
        board = boards[random_index]
        post = PostModel(title = title, content = content, board = board, author = author)
        db.session.add(post)
    db.session.commit()
    click.echo("测试帖子生成成功!")
    print("✓ 测试帖子创建成功")

@admin_cli.command("init")
def init_db():
    # 创建权限数据
    create_permission()
    # 创建角色数据
    create_role()
    # 创建员工数据
    create_test_user()
    # 创建板块
    create_board()
    # 生成测试帖子
    create_test_post()