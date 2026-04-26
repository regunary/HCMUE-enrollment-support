from enum import Enum
from rest_framework.exceptions import APIException
from rest_framework.response import Response


# log = logging.getLogger("django")


class ValidationStatusEnum(Enum):
    OK = "OK"
    ERROR = "ERROR"
    WARNING = "WARNING"


class ValidationCodeEnum(Enum):
    ERR_COM_000 = "Internal error"
    ERR_USER_000 = "Wrong username or password"
    ERR_USER_001 = "User is banned"
    ERR_USER_002 = "Invalid phone number format"
    ERR_USER_003 = "Phone number already registered"
    ERR_USER_004 = "Invalid OTP"
    ERR_USER_005 = "OTP expired or not found"
    ERR_USER_006 = "Password is required"

    ERR_TOKEN_000 = "Invalid token"
    ERR_TOKEN_001 = "Token expired"

    AUTHORIZATION_HEADER_NOT_FOUND = "Authorization header is not found"

    TOKEN_EXPIRED = "Token is expired"
    INVALID_TOKEN = "Invalid token"


class ValidationError(APIException):
    def __init__(
        self,
        validation_code: ValidationCodeEnum,
        status_code: int = 400,
        error_fields: str | list[str] = None,
    ):
        detail = (
            validation_code.value
            if error_fields is None
            else validation_code.value.format(error_fields)
        )
        super().__init__(
            detail=detail,
            code=validation_code.name,
        )
        self.status_code = status_code
        self.code = validation_code.name


def exception_handler(exc: APIException, context: object):
    return Response(
        data={
            "error_code": exc.get_codes(),
            "message": exc.detail,
        },
        status=exc.status_code,
    )
