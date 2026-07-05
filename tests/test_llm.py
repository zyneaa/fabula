import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.llm import OpenRouterProvider


def test_openrouter_init():
    provider = OpenRouterProvider(api_key="test-key")
    assert provider.api_key == "test-key"


@pytest.mark.asyncio
async def test_openrouter_complete():
    provider = OpenRouterProvider(api_key="test-key")

    mock_response = MagicMock()
    mock_response.json.return_value = {"choices": [{"message": {"content": "Hello!"}}]}
    mock_response.raise_for_status = MagicMock()

    with patch.object(
        provider.client, "post", new=AsyncMock(return_value=mock_response)
    ):
        result = await provider.complete(
            messages=[{"role": "user", "content": "Hi"}], model="openai/gpt-4o"
        )

    assert result == "Hello!"


@pytest.mark.asyncio
async def test_openrouter_no_api_key():
    with patch("app.services.llm.settings") as mock_settings:
        mock_settings.OPENROUTER_API_KEY = ""
        provider = OpenRouterProvider(api_key="")
        with pytest.raises(ValueError, match="OPENROUTER_API_KEY not configured"):
            await provider.complete(
                messages=[{"role": "user", "content": "Hi"}], model="openai/gpt-4o"
            )
