import requests
import json

class AIService:
    def __init__(self):
        # deepseek API 密钥
        self.api_key = "sk-5bea8058f7d84d5d8ac937ce6fa986f1" 
        self.base_url = "https://api.deepseek.com/chat/completions"
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
    
    def generate_inspiration(self, prompt=None):
        """生成创作灵感"""
        if not prompt:
            prompt = "请为学习社区生成一些有趣的帖子主题，涵盖技术、学习方法、职业发展等方面"
        
        messages = [
            {"role": "system", "content": "你是一个专业的内容创作助手，为学习社区提供有趣且有价值的帖子主题建议"},
            {"role": "user", "content": prompt}
        ]
        
        return self._call_api(messages)
    
    def continue_content(self, existing_content, prompt=None):
        """内容续写"""
        if prompt:
            prompt = f"{prompt}\n\n请继续撰写以下内容，保持风格一致，内容连贯：\n\n{existing_content}"
        else:
            prompt = f"请继续撰写以下内容，保持风格一致，内容连贯：\n\n{existing_content}"
        
        messages = [
            {"role": "system", "content": "你是一个专业的内容创作助手，擅长续写各种类型的内容，保持风格一致，内容连贯"},
            {"role": "user", "content": prompt}
        ]
        
        return self._call_api(messages)
    
    def optimize_structure(self, content, prompt=None):
        """结构优化"""
        if prompt:
            prompt = f"{prompt}\n\n请优化以下内容的结构，使其更清晰、逻辑更严谨：\n\n{content}"
        else:
            prompt = f"请优化以下内容的结构，使其更清晰、逻辑更严谨：\n\n{content}"
        
        messages = [
            {"role": "system", "content": "你是一个专业的内容编辑助手，擅长优化文章结构，使其更清晰、逻辑更严谨"},
            {"role": "user", "content": prompt}
        ]
        
        return self._call_api(messages)
    
    def polish_content(self, content, prompt=None):
        """AI润色"""
        if prompt:
            prompt = f"{prompt}\n\n请润色以下内容，使其更流畅、更专业：\n\n{content}"
        else:
            prompt = f"请润色以下内容，使其更流畅、更专业：\n\n{content}"
        
        messages = [
            {"role": "system", "content": "你是一个专业的内容润色助手，擅长提升文字表达的流畅性和专业性"},
            {"role": "user", "content": prompt}
        ]
        
        return self._call_api(messages)
    
    def generate_reply_template(self, context=None, prompt=None):
        """生成专业回复模板"""
        if not prompt:
            if context:
                prompt = f"请根据以下上下文生成一个专业的回复模板：\n\n{context}"
            else:
                prompt = "请生成一些适用于学习社区的专业回复模板，用于回复用户提问、感谢用户分享等场景"
        
        messages = [
            {"role": "system", "content": "你是一个专业的社区运营助手，擅长生成各种场景下的专业回复模板"},
            {"role": "user", "content": prompt}
        ]
        
        return self._call_api(messages)
    
    def _call_api(self, messages):
        """调用deepseekAPI的通用方法"""
        try:
            data = {
                "model": "deepseek-chat",
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 1000
            }
            
            response = requests.post(self.base_url, headers=self.headers, data=json.dumps(data))
            response.raise_for_status()
            
            result = response.json()
            return result["choices"][0]["message"]["content"]
        except requests.exceptions.RequestException as e:
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    return f"调用AI服务失败：{e.response.status_code} - {error_data.get('error', {}).get('message', str(e))}"
                except:
                    return f"调用AI服务失败：{e.response.status_code} - {e.response.text}"
            return f"调用AI服务失败：网络请求错误 - {str(e)}"
        except Exception as e:
            import traceback
            return f"调用AI服务失败：{str(e)}\n{traceback.format_exc()}"

# 创建全局AI服务实例
ai_service = AIService()
