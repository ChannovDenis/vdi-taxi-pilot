from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./vdi_taxi.db"
    jwt_secret: str = "change-me-in-production-use-openssl-rand-hex-32"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480  # 8 hours

    # Guacamole
    guacamole_url: str = "http://localhost:8085/guacamole"
    guacamole_admin_user: str = "guacadmin"
    guacamole_admin_pass: str = "guacadmin"

    # Telegram
    telegram_bot_token: str = ""

    model_config = {"env_prefix": "VDI_"}


settings = Settings()
