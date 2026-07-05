from typing import Protocol, AsyncIterator

import httpx
import structlog

from app.config import settings

logger = structlog.get_logger()


class LLMProvider(Protocol):
    async def complete(self, messages: list[dict], model: str, **kwargs) -> str: ...
    def stream(
        self, messages: list[dict], model: str, **kwargs
    ) -> AsyncIterator[str]: ...


class OpenRouterProvider:
    BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.client = httpx.AsyncClient(timeout=60.0)

    async def complete(self, messages: list[dict], model: str, **kwargs) -> str:
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY not configured")

        payload = {
            "model": model,
            "messages": messages,
            **kwargs,
        }

        response = await self.client.post(
            self.BASE_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()

        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def stream(
        self, messages: list[dict], model: str, **kwargs
    ) -> AsyncIterator[str]:
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY not configured")

        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            **kwargs,
        }

        async with self.client.stream(
            "POST",
            self.BASE_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    import json

                    chunk = json.loads(data)
                    if chunk["choices"][0].get("delta", {}).get("content"):
                        yield chunk["choices"][0]["delta"]["content"]

    async def close(self):
        await self.client.aclose()


def get_provider() -> LLMProvider:
    return OpenRouterProvider()
