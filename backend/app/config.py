from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Orbitwin - Mission Digital Twin"
    database_url: str = "sqlite:///./twinlab.db"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    ai_enabled: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
