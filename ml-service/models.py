from pydantic import BaseModel
from typing import List, Optional

class Candle(BaseModel):
    open: float
    high: float
    low: float
    close: float
    volume: Optional[float] = 0
    timestamp: Optional[str] = None

class PredictRequest(BaseModel):
    candles: List[Candle]

class PatternResult(BaseModel):
    pattern: str
    start: int
    end: int
    confidence: float
    signal: str

class PredictResponse(BaseModel):
    patterns: List[PatternResult]
