from pydantic import BaseModel


class InjectRequest(BaseModel):
    fault_type: str


class AIKeyRequest(BaseModel):
    key: str = ""
    model: str = "gemini-2.0-flash"
