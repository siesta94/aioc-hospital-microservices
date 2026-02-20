from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    HOSPITAL_NAME: str = "AIOC Hospital"
    HOSPITAL_ADDRESS: str = "Milutina Milankovića 12, 11000 Beograd, Serbia"
    HOSPITAL_PHONE: str = "+381 11 2345-678"


settings = Settings()
