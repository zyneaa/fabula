# Episode 3 — LLM Integration

## Goal

OpenRouter client, pluggable interface, teacher config.

## Tasks

1. `services/llm.py` — LLM provider interface:
   ```python
   class LLMProvider(Protocol):
       async def complete(self, messages, model, **kwargs) -> str: ...
       async def stream(self, messages, model, **kwargs) -> AsyncIterator[str]: ...
   ```
2. `OpenRouterProvider` impl — httpx calls to OpenRouter API
3. `api/llm_config.py` — teacher CRUD for model configs
4. Model selection logic: check LLMConfig → pick active model → fallback to default
5. `core/rate_limit.py` — slowapi setup:
   - Auth endpoints: 5/min
   - LLM generation: 10/min (student), 30/min (teacher)
   - General: 60/min

## Deliverable

Teacher configures models. LLM calls work via OpenRouter.

## Status

**Done.**
