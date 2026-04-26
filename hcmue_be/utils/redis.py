from redis import Redis

from core.settings.deployment import REDIS_EXPIRATION_TIME, REDIS_HOST, REDIS_PORT

redis_client = Redis(host=REDIS_HOST, port=REDIS_PORT, db=2)


def set(key: str, ttl: int = 3600) -> None:
    """
    Create a key with a value of 1 and a time-to-live (TTL) of 3600 seconds (1 hour).
    """
    redis_client.set(key, 1, ex=REDIS_EXPIRATION_TIME)
    return None


def get(key: str) -> bool:
    """
    Get the value of the key.
    """
    value = redis_client.get(key)
    return value
