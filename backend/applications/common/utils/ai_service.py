import json
import logging
import os
import traceback

import requests

logger = logging.getLogger(__name__)


class AIResult(dict):
    @property
    def text(self):
        return self.get("text", "")

    @property
    def usage(self):
        return self.get("usage")

    def startswith(self, prefix):
        return self.text.startswith(prefix)


class AIService:
    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY", "")
        self.endpoint = "https://api.deepseek.com/chat/completions"
        self.model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    def generate_inspiration(self, prompt=None):
        prompt = prompt or (
            "Please generate a warm, natural Chinese forum post title and opening paragraph "
            "for a learning community. Put the title on the first line and the body after it."
        )
        return self._chat(
            "You help users write sincere, useful Chinese posts for a learning community.",
            prompt,
        )

    def continue_content(self, existing_content, prompt=None):
        user_prompt = prompt or (
            "Continue the following Chinese community post. Keep the original tone. "
            "Do not repeat existing content. Only output the continuation."
        )
        return self._chat(
            "You are a Chinese writing assistant who continues posts naturally.",
            f"{user_prompt}\n\nExisting content:\n{existing_content}",
        )

    def optimize_structure(self, content, prompt=None):
        user_prompt = prompt or (
            "Improve the structure of the following Chinese community post. "
            "Make it clearer and better organized, but do not make it stiff or bureaucratic."
        )
        return self._chat(
            "You are an editor who improves structure while preserving the author's voice.",
            f"{user_prompt}\n\nOriginal text:\n{content}",
        )

    def polish_content(self, content, prompt=None):
        user_prompt = prompt or (
            "Polish the following Chinese community post. Make it natural, sincere, clear, "
            "and easier for others to respond to. Do not make it overly formal."
        )
        return self._chat(
            "You are a Chinese polishing assistant for warm community writing.",
            f"{user_prompt}\n\nOriginal text:\n{content}",
        )

    def generate_reply_template(self, context=None, prompt=None):
        if not prompt:
            prompt = (
                f"Generate a natural Chinese reply template based on this context:\n\n{context}"
                if context
                else "Generate several natural Chinese reply templates for a learning community."
            )
        return self._chat(
            "You help community operators write friendly, usable Chinese replies.",
            prompt,
        )

    def _chat(self, system_prompt, user_prompt):
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        return self._call_api(messages)

    def _call_api(self, messages):
        if not self.api_key:
            return AIResult(text="AI service failed: DEEPSEEK_API_KEY is not configured")

        try:
            logger.info("Calling DeepSeek model=%s endpoint=%s", self.model, self.endpoint)
            response = requests.post(
                self.endpoint,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                },
                data=json.dumps(
                    {
                        "model": self.model,
                        "messages": messages,
                        "stream": False,
                    },
                    ensure_ascii=False,
                ),
                timeout=45,
            )
            response.raise_for_status()
            result = response.json()
            usage = result.get("usage")
            logger.info("DeepSeek response usage=%s", usage)
            return AIResult(
                text=result["choices"][0]["message"]["content"],
                usage=usage,
                model=result.get("model", self.model),
            )
        except requests.exceptions.RequestException as exc:
            if getattr(exc, "response", None) is not None:
                try:
                    error_data = exc.response.json()
                    detail = error_data.get("error", {}).get("message", str(exc))
                except ValueError:
                    detail = exc.response.text
                logger.warning("DeepSeek request failed status=%s detail=%s", exc.response.status_code, detail)
                return AIResult(text=f"AI service failed: {exc.response.status_code} - {detail}")
            logger.warning("DeepSeek network error: %s", exc)
            return AIResult(text=f"AI service failed: network error - {exc}")
        except Exception as exc:
            logger.exception("DeepSeek call crashed")
            return AIResult(text=f"AI service failed: {exc}\n{traceback.format_exc()}")


ai_service = AIService()
