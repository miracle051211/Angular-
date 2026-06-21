# enum妯″潡鎻愪緵浜嗕竴绉嶅畾涔夋灇涓剧被鍨嬬殑鏂瑰紡锛岀敤浜庤〃绀轰竴缁勬湁闄愮殑銆佸敮涓€鐨勫父閲忓€?
from enum import Enum
from applications.extentions.init_sqlalchemy import db
from datetime import date, datetime
from shortuuid import uuid
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

class PermissionEnum(Enum):
    Board = "板块"
    POST = "帖子"
    COMMENT = "评论"
    FRONT_USER = "前台用户"
    CMD_USER = "后台用户"

class PermissionModel(db.Model):
    __tablename__ = "permission"
    id = db.Column(db.Integer, primary_key = True, autoincrement = True)
    name = db.Column(db.Enum(PermissionEnum), nullable = False, unique = True)

role_permission_table = db.Table(
    "role_permission_table",
    db.Column("role_id", db.Integer, db.ForeignKey("role.id")),
    db.Column("permission_id", db.Integer, db.ForeignKey("permission.id"))
)

class RoleModel(db.Model):
    __tablename__ = "role"
    id = db.Column(db.Integer, primary_key = True, autoincrement = True)
    name = db.Column(db.String(50), nullable = False)
    # 瑙掕壊鎻忚堪desc
    desc = db.Column(db.String(200), nullable = False)
    create_time = db.Column(db.DateTime, default = datetime.now)
    # 瀹炵幇many2many
    permissions = db.relationship("PermissionModel", secondary = role_permission_table, backref = "roles")

class FollowModel(db.Model):
    __tablename__ = "follow"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    follower_id = db.Column(db.String(100), db.ForeignKey("user.id"), nullable=False)
    followed_id = db.Column(db.String(100), db.ForeignKey("user.id"), nullable=False)
    create_time = db.Column(db.DateTime, default=datetime.now)

    follower = db.relationship(
        "UserModel",
        foreign_keys=[follower_id],
        backref=db.backref("following_relations", lazy="dynamic"),
    )
    followed = db.relationship(
        "UserModel",
        foreign_keys=[followed_id],
        backref=db.backref("follower_relations", lazy="dynamic"),
    )

    __table_args__ = (
        db.UniqueConstraint("follower_id", "followed_id", name="_follower_followed_uc"),
    )

class UserModel(UserMixin, db.Model):
    __tablename__ = "user"
    id = db.Column(db.String(100), primary_key = True, default = uuid)
    username = db.Column(db.String(50), nullable = False, unique = True)
    # 灏唒assword鏀规垚_password
    _password = db.Column(db.String(200), nullable = False)
    email = db.Column(db.String(50), nullable = False, unique = True)
    # avatar 澶村儚, 瀛樺偍鍥剧墖鍦ㄦ湇鍔″櫒涓繚瀛樼殑璺緞锛?鍙互涓虹┖
    avatar = db.Column(db.String(100))
    # signature 绛惧悕, 鍙互涓虹┖
    signature = db.Column(db.String(100))
    gender = db.Column(db.String(20))
    join_time = db.Column(db.DateTime, default = datetime.now) 
    # 鏄惁鏄憳宸ワ紝鍙湁鍛樺伐鎵嶅彲浠ヨ繘鍏ュ悗鍙扮郴缁燂紝榛樿涓篎alse
    is_staff = db.Column(db.Boolean, default = False, nullable = False)
    # 鏄惁鍙敤锛岄粯璁ゆ儏鍐典笅鏄彲鐢ㄧ殑锛屽鏋滀笉鍙敤锛屽垯浼氶檺鍒跺叾鐧诲綍
    is_active = db.Column(db.Boolean, default = True, nullable = False)
    
    # 闅愮璁剧疆
    is_profile_public = db.Column(db.Boolean, default=True, nullable=False)  # 涓汉璧勬枡鏄惁鍏紑
    show_email = db.Column(db.Boolean, default=True, nullable=False)  # 鏄惁鏄剧ず閭
    
    # 閫氱煡璁剧疆
    notify_new_message = db.Column(db.Boolean, default=True, nullable=False)  # 鏂版秷鎭€氱煡
    notify_comment_reply = db.Column(db.Boolean, default=True, nullable=False)  # 璇勮鍥炲閫氱煡
    notify_post_like = db.Column(db.Boolean, default=True, nullable=False)  # 甯栧瓙鐐硅禐閫氱煡
    notify_comment_like = db.Column(db.Boolean, default=True, nullable=False)  # 璇勮鐐硅禐閫氱煡
    receive_email_notifications = db.Column(db.Boolean, default=False, nullable=False)  # 鏄惁鎺ユ敹閭欢閫氱煡
    experience = db.Column(db.Integer, default=0, nullable=False)
    last_login_bonus_date = db.Column(db.Date, nullable=True)

    # 澶栭敭
    role_id = db.Column(db.Integer, db.ForeignKey("role.id"))
    role = db.relationship("RoleModel", backref = "users")

    # arg *args **kwargs 浼犲弬椤哄簭 *args鏄厓缁?**kwagrs鏄垪琛?
    # *args灏哸rg(浣嶇疆鍙傛暟)鍚庣殑鎵€鏈変綅缃弬鏁版斁鍒颁簡涓€涓厓缁勯噷 **kwargs灏嗗叧閿瓧鍙傛暟鏀惧埌浜嗗瓧鍏搁噷褰㈡垚閿€煎
    def __init__(self, *args, **kwargs):
        if "password" in kwargs:
            self.password = kwargs.get("password")
            kwargs.pop("password")
        super(UserModel, self).__init__(*args, **kwargs)

    # 瀵嗙爜鍔犲瘑绠＄悊
    @property
    # 灏唒assword()鏂规硶瀹氫箟涓哄睘鎬э紝 浠ュ悗閫氳繃user.password鍙互鑾峰彇鍔犲瘑鍚庣殑瀵嗙爜
    def password(self):
        return self._password
    
    @password.setter
    # 閫氳繃user.password = "xxxxxx"浼氳Е鍙慇password.setter涓嬬殑password鏂规硶
    def password(self, raw_password):
        self._password = generate_password_hash(raw_password)

    # 瀵嗙爜楠岃瘉
    def check_password(self, raw_password):
        # 浠ュ悗閫氳繃user.check_password("password")鍗冲彲杩斿洖瀵嗙爜鏄惁姝ｇ‘
        result = check_password_hash(self.password, raw_password)
        return result
    
    # 妫€鏌ユ槸鍚︽湁鏉冮檺
    def has_permission(self, permission):
        # 纭繚鑾峰彇鏈€鏂扮殑鏉冮檺淇℃伅
        if not self.role:
            return False
        # 妫€鏌ユ潈闄愬垪琛ㄦ槸鍚﹀瓨鍦ㄤ笖涓嶄负绌?
        if not hasattr(self.role, 'permissions') or not self.role.permissions:
            return False
        return permission in [p.name for p in self.role.permissions]

    def add_experience(self, amount):
        self.experience = max(0, (self.experience or 0) + amount)

    def grant_daily_login_experience(self):
        today = date.today()
        if self.last_login_bonus_date == today:
            return False
        self.add_experience(1)
        self.last_login_bonus_date = today
        return True

    @property
    def title_profile(self):
        return title_profile_for_experience(self.experience or 0)


TITLE_TIERS = (
    {"name": "山水之间", "start_level": 1, "end_level": 3, "step": 20},
    {"name": "半城烟沙", "start_level": 4, "end_level": 6, "step": 50},
    {"name": "断桥残雪", "start_level": 7, "end_level": 9, "step": 100},
    {"name": "清明雨上", "start_level": 10, "end_level": 10, "step": 0},
)

LEVEL_START_EXPERIENCE = {
    1: 0,
    2: 20,
    3: 40,
    4: 60,
    5: 110,
    6: 160,
    7: 210,
    8: 310,
    9: 410,
    10: 1410,
}

LEVEL_UP_REQUIREMENTS = {
    1: 20,
    2: 20,
    3: 20,
    4: 50,
    5: 50,
    6: 50,
    7: 100,
    8: 100,
    9: 1000,
}


def title_profile_for_experience(experience):
    exp = max(0, int(experience or 0))
    level = 1
    for candidate in range(10, 0, -1):
        if exp >= LEVEL_START_EXPERIENCE[candidate]:
            level = candidate
            break

    tier = next(
        item for item in TITLE_TIERS
        if item["start_level"] <= level <= item["end_level"]
    )
    current_exp = max(0, exp - LEVEL_START_EXPERIENCE[level])
    required_exp = LEVEL_UP_REQUIREMENTS.get(level, 0)
    progress = 1 if required_exp == 0 else min(1, current_exp / required_exp)

    return {
        "name": tier["name"],
        "level": level,
        "experience": exp,
        "currentLevelExperience": current_exp,
        "nextLevelExperience": required_exp,
        "progress": progress,
        "isMaxLevel": level >= 10,
    }
    





