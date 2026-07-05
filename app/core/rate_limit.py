from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

limiter = Limiter(key_func=get_remote_address)


def setup_rate_limiting(app):
    app.state.limiter = limiter

    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Please try again later."},
        )


def auth_rate_limit():
    return limiter.limit("5/minute")


def llm_student_limit():
    return limiter.limit("10/minute")


def llm_teacher_limit():
    return limiter.limit("30/minute")


def general_limit():
    return limiter.limit("60/minute")
