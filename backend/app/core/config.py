from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENV: str = "development"
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    DATABASE_URL: str = "sqlite+aiosqlite:///./renoog.db"
    DEFAULT_MODEL: str = "anthropic/claude-3.5-sonnet"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
