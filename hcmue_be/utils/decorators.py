from delivery.configs.settings import ACCESS_TOKEN_SECRET
from delivery.utils.validation import ValidationError, ValidationCodeEnum
import jwt

from functools import wraps


def auth_required(view_type: str = "api-view"):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # print("args", args)
            # print("headers", args[1].headers)
            user_id = None
            request = args[1]
            authorization = None

            if view_type == "api-view":
                authorization = args[0].headers.get("Authorization", None)
            else:
                authorization = args[1].headers.get("Authorization", None)

            if not authorization:
                return ValidationError(
                    ValidationCodeEnum.AUTHORIZATION_HEADER_NOT_FOUND
                )
            token = request.headers["Authorization"].split(" ")[1]
            try:
                payload = jwt.decode(
                    token,
                    ACCESS_TOKEN_SECRET,
                    algorithms=["HS256"],
                    audience=["delivery"],
                )
                user_id = payload["user_id"]
            except jwt.ExpiredSignatureError:
                return ValidationError(ValidationCodeEnum.TOKEN_EXPIRED)
            except jwt.InvalidTokenError:
                return ValidationError(ValidationCodeEnum.INVALID_TOKEN)
            return func(*args, **kwargs, user_id=user_id)

        return wrapper

    return decorator
