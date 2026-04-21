"""
Pattern Scanner — FastAPI ML Service
POST /predict   — receives candles from Node.js backend, returns detected pattern
GET  /health    — liveness check
"""

import time
from typing import Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from pattern_detector import detect_patterns


# ─── Lifespan ───────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[ML SERVICE] 🚀 Pattern Scanner started on port 8000")
    yield
    print("[ML SERVICE] 🛑 Pattern Scanner shutting down")


app = FastAPI(title="Pattern Scanner", version="1.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Models ─────────────────────────────────────────────────────────────────

class Candle(BaseModel):
    # Accept both `time` and `timestamp` field names from Node.js
    time:      Optional[Any] = None
    timestamp: Optional[Any] = None
    open:      float
    high:      float
    low:       float
    close:     float
    volume:    float = 0.0


class PredictRequest(BaseModel):
    stock_symbol: str
    timeframe:    str = "1d"
    candles:      list[Candle]


# ─── Local Inference ─────────────────────────────────────────────────────────

def local_inference(pattern: dict, bars: list[dict]) -> dict:
    """
    Rule-based signal + confidence scorer.
    Returns trend (UP/DOWN/NEUTRAL), confidence (0–100), and a reason string.
    """
    closes  = [b["close"]  for b in bars]
    volumes = [b["volume"] for b in bars]

    if len(closes) < 5:
        return {"trend": "NEUTRAL", "confidence": 50, "reason": "Insufficient data"}

    price_change = closes[-1] - closes[-5]
    pattern_name = pattern.get("type", "").lower().replace(" ", "_").replace("&", "and")

    BULLISH = {"double_bottom", "inv_head_and_shoulders", "ascending_triangle", "bull_flag"}
    BEARISH = {"double_top",    "head_and_shoulders",     "descending_triangle"}

    if pattern_name in BULLISH:
        trend = "UP"
    elif pattern_name in BEARISH:
        trend = "DOWN"
    else:
        trend = "NEUTRAL"

    # Base confidence from pattern quality score (0–9.9 scale → map to 55–90)
    quality   = float(pattern.get("quality", 5.0))
    base_conf = 55 + (quality / 9.9) * 35   # range 55–90

    # Momentum bonus (up to +8)
    avg_price = sum(closes[-5:]) / 5 or 1
    momentum  = min(8, abs(price_change / avg_price) * 100)
    base_conf += momentum

    # Volume confirmation bonus (up to +5)
    if len(volumes) >= 2:
        avg_vol = sum(volumes[-5:]) / max(len(volumes[-5:]), 1) or 1
        if volumes[-1] > avg_vol * 1.1:
            base_conf += 5

    confidence = max(50, min(95, round(base_conf, 2)))

    return {
        "trend":      trend,
        "confidence": confidence,
        "reason":     f"{pattern_name} signals {trend} with {confidence:.0f}% confidence",
    }


# ─── Routes ─────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service":   "ML Pattern Detection Service",
        "status":    "running",
        "endpoints": ["/predict", "/health"],
    }


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": int(time.time())}


@app.post("/predict")
async def predict(req: PredictRequest):
    """
    Main endpoint called by Node.js alertEngine / mlService.
    Accepts OHLCV candles, runs pattern detection, returns best match.
    """
    symbol = req.stock_symbol.upper()
    print(f"[ML SERVICE] /predict  symbol={symbol}  candles={len(req.candles)}  timeframe={req.timeframe}")

    # ── 1. Convert Pydantic candles → plain dicts ────────────
    bars = []
    for c in req.candles:
        raw = c.model_dump()
        t   = raw.get("time") or raw.get("timestamp")
        bars.append({
            "time":   t,
            "open":   float(raw["open"]),
            "high":   float(raw["high"]),
            "low":    float(raw["low"]),
            "close":  float(raw["close"]),
            "volume": float(raw.get("volume") or 0),
        })

    # ── 2. Minimum data check ────────────────────────────────
    if len(bars) < 20:
        print(f"[ML SERVICE] Not enough data for {symbol}: {len(bars)} bars")
        return JSONResponse(
            {"success": False, "message": f"Not enough data ({len(bars)} bars, need ≥20)"},
            status_code=400,
        )

    # ── 3. Detect patterns ───────────────────────────────────
    try:
        patterns = detect_patterns(bars)
    except Exception as e:
        print(f"[ML SERVICE] Pattern detection error for {symbol}: {e}")
        return JSONResponse(
            {"success": False, "message": f"Detection error: {str(e)}"},
            status_code=500,
        )

    if not patterns:
        print(f"[ML SERVICE] No patterns detected for {symbol}")
        return {"success": False, "message": "No patterns detected"}

    # ── 4. Score best pattern ─────────────────────────────────
    best      = patterns[0]  # already sorted by quality desc
    inference = local_inference(best, bars)

    confidence_0_to_1 = round(inference["confidence"] / 100, 4)

    signal_map = {"UP": "BUY", "DOWN": "SELL", "NEUTRAL": "HOLD"}
    signal     = signal_map.get(inference["trend"], "HOLD")

    # start_time / end_time from bar indices
    start_idx = best.get("start", 0)
    end_idx   = best.get("end",   len(bars) - 1)
    start_ts  = bars[min(start_idx, len(bars)-1)]["time"]
    end_ts    = bars[min(end_idx,   len(bars)-1)]["time"]

    result = {
        "pattern_type": best["type"],
        "probability":  confidence_0_to_1,   # 0.0 – 1.0 for alertEngine threshold
        "signal":       signal,
        "start_time":   start_ts,
        "end_time":     end_ts,
        "direction":    best.get("direction", "NEUTRAL"),
        "quality":      best.get("quality", 0),
        "grade":        best.get("grade", "C"),
        "neckline":     best.get("neckline"),
        "details":      best.get("details", ""),
        "reason":       inference["reason"],
    }

    print(f"[ML SERVICE] ✅ {symbol} → {result['pattern_type']} | {signal} | {confidence_0_to_1*100:.0f}%")
    return result


# ─── Run ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
