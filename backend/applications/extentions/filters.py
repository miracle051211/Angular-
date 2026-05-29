import hashlib
import datetime
import re

def email_hash(email):
    return hashlib.md5(email.lower().encode("utf-8")).hexdigest()


def friendly_time(dt):
    """将 datetime 对象转换为友好的时间表示"""
    now = datetime.datetime.now()
    diff = now - dt
    
    if diff.days == 0:
        if diff.seconds < 60:
            return "刚刚"
        elif diff.seconds < 3600:
            minutes = diff.seconds // 60
            return f"{minutes}分钟前"
        elif diff.seconds < 86400:
            hours = diff.seconds // 3600
            return f"{hours}小时前"
    elif diff.days == 1:
        return "昨天"
    elif diff.days == 2:
        return "前天"
    elif diff.days < 7:
        return f"{diff.days}天前"
    elif diff.days < 30:
        weeks = diff.days // 7
        return f"{weeks}周前"
    elif diff.days < 365:
        months = diff.days // 30
        return f"{months}个月前"
    else:
        years = diff.days // 365
        return f"{years}年前"


def remove_html_tags(text):
    """移除HTML标签，返回纯文本"""
    if not text:
        return ""
    # 使用正则表达式移除所有HTML标签
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text)

