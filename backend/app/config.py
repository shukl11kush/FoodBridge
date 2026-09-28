import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "FoodBridge API"
    api_port: int = 8000
    secret_key: str = "foodbridge-super-secret-key-change-in-prod"
    algorithm: str = "HS256"
    access_token_expire_hours: int = 24

    # Database configuration: Oracle or SQLite fallback
    db_type: str = os.getenv("DB_TYPE", "sqlite") # "oracle" or "sqlite"
    oracle_user: str = os.getenv("ORACLE_USER", "system")
    oracle_password: str = os.getenv("ORACLE_PASSWORD", "password")
    oracle_host: str = os.getenv("ORACLE_HOST", "localhost")
    oracle_port: int = int(os.getenv("ORACLE_PORT", "1521"))
    oracle_service: str = os.getenv("ORACLE_SERVICE", "XEPDB1")

    # AI Provider configuration
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")

    @property
    def database_url(self) -> str:
        if self.db_type == "oracle":
            return f"oracle+oracledb://{self.oracle_user}:{self.oracle_password}@{self.oracle_host}:{self.oracle_port}/?service_name={self.oracle_service}"
        # Fallback to local SQLite file
        return "sqlite:///./foodbridge.db"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
