from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "mysql+pymysql://wavy:wavy_secret@127.0.0.1:3306/wavy_crm?charset=utf8mb4"
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    cors_origins: str = "*"
    free_tier_max_clients: int = 15
    premium_price_byn_month: str = "9.99"
    dev_mode: bool = False


settings = Settings()
