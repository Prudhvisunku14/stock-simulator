"""
Pattern Detector — geometric + rule-based chart pattern recognition

Detects:
  • Double Bottom / Double Top
  • Head & Shoulders / Inverse H&S
  • Ascending / Descending Triangle
  • Bull / Bear Flag
"""

from __future__ import annotations
import math
from typing import Any


# ─── Helpers ────────────────────────────────────────────────────────────────

def _closes(bars: list[dict]) -> list[float]:
    return [b["close"] for b in bars]

def _highs(bars: list[dict]) -> list[float]:
    return [b["high"] for b in bars]

def _lows(bars: list[dict]) -> list[float]:
    return [b["low"] for b in bars]

def _local_minima(values: list[float], window: int = 4) -> list[int]:
    n = len(values)
    result = []
    for i in range(window, n - window):
        if all(values[i] <= values[j] for j in range(i - window, i + window + 1) if j != i):
            result.append(i)
    return result

def _local_maxima(values: list[float], window: int = 4) -> list[int]:
    n = len(values)
    result = []
    for i in range(window, n - window):
        if all(values[i] >= values[j] for j in range(i - window, i + window + 1) if j != i):
            result.append(i)
    return result

def _quality_score(base: float, bonus_factors: list[tuple[float, float]]) -> float:
    """base + weighted bonuses, capped at 9.9"""
    score = base
    for weight, factor in bonus_factors:
        score += weight * max(0.0, min(1.0, factor))
    return round(min(9.9, score), 1)

def _grade(q: float) -> str:
    if q >= 9.0: return "A+"
    if q >= 8.0: return "A"
    if q >= 7.0: return "B+"
    if q >= 6.0: return "B"
    return "C"

def _trend_slope(values: list[float]) -> float:
    """Linear regression slope normalised by mean"""
    n = len(values)
    if n < 2:
        return 0.0
    x_mean = (n - 1) / 2
    y_mean = sum(values) / n
    num = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
    den = sum((i - x_mean) ** 2 for i in range(n))
    slope = num / den if den else 0.0
    return slope / (y_mean or 1.0)  # normalised


# ─── Pattern detectors ──────────────────────────────────────────────────────

def _detect_double_bottom(bars: list[dict], lows: list[float]) -> list[dict]:
    patterns = []
    minima = _local_minima(lows)

    for ai, bi in [(a, b) for a in minima for b in minima if b > a]:
        gap = bi - ai
        if not (6 <= gap <= 35):
            continue
        price_diff = abs(lows[ai] - lows[bi]) / lows[ai]
        if price_diff > 0.045:
            continue
        peak_idx = max(range(ai, bi + 1), key=lambda i: bars[i]["high"])
        neckline = bars[peak_idx]["high"]
        # volume confirmation (second bottom ideally lower volume)
        vol_ok = bars[bi].get("volume", 1) < bars[ai].get("volume", 1) * 1.5
        q = _quality_score(5.0, [
            (2.5, 1 - price_diff / 0.045),
            (1.0, 1 - gap / 35),
            (0.8, 1.0 if vol_ok else 0.0),
            (0.6, 1.0),  # base reliability bonus
        ])
        patterns.append({
            "type": "Double Bottom",
            "direction": "BULLISH",
            "start": ai,
            "end": min(bi + 6, len(bars) - 1),
            "neckline": neckline,
            "quality": q,
            "grade": _grade(q),
            "color": "rgba(29,158,117,0.15)",
            "border_color": "#1D9E75",
            "details": f"Lows at {lows[ai]:.2f} & {lows[bi]:.2f} (diff {price_diff*100:.1f}%), neckline {neckline:.2f}",
        })
    return patterns


def _detect_double_top(bars: list[dict], highs: list[float]) -> list[dict]:
    patterns = []
    maxima = _local_maxima(highs)

    for ai, bi in [(a, b) for a in maxima for b in maxima if b > a]:
        gap = bi - ai
        if not (6 <= gap <= 35):
            continue
        price_diff = abs(highs[ai] - highs[bi]) / highs[ai]
        if price_diff > 0.045:
            continue
        trough_idx = min(range(ai, bi + 1), key=lambda i: bars[i]["low"])
        neckline = bars[trough_idx]["low"]
        q = _quality_score(5.0, [
            (2.5, 1 - price_diff / 0.045),
            (1.0, 1 - gap / 35),
            (1.4, 1.0),
        ])
        patterns.append({
            "type": "Double Top",
            "direction": "BEARISH",
            "start": ai,
            "end": min(bi + 6, len(bars) - 1),
            "neckline": neckline,
            "quality": q,
            "grade": _grade(q),
            "color": "rgba(216,90,48,0.15)",
            "border_color": "#D85A30",
            "details": f"Peaks at {highs[ai]:.2f} & {highs[bi]:.2f} (diff {price_diff*100:.1f}%), neckline {neckline:.2f}",
        })
    return patterns


def _detect_head_and_shoulders(bars: list[dict], highs: list[float]) -> list[dict]:
    patterns = []
    maxima = _local_maxima(highs, window=3)

    for i in range(len(maxima) - 2):
        ls, hd, rs = maxima[i], maxima[i + 1], maxima[i + 2]
        if hd - ls < 4 or rs - hd < 4:
            continue
        if not (highs[hd] > highs[ls] and highs[hd] > highs[rs]):
            continue
        shoulder_diff = abs(highs[ls] - highs[rs]) / highs[ls]
        if shoulder_diff > 0.07:
            continue
        # neckline = average of troughs between shoulders
        trough1 = min(bars[j]["low"] for j in range(ls, hd + 1))
        trough2 = min(bars[j]["low"] for j in range(hd, rs + 1))
        neckline = (trough1 + trough2) / 2
        q = _quality_score(5.5, [
            (2.5, 1 - shoulder_diff / 0.07),
            (1.0, min(1.0, (highs[hd] - highs[ls]) / (highs[ls] * 0.05))),
            (1.0, 1.0),
        ])
        patterns.append({
            "type": "Head & Shoulders",
            "direction": "BEARISH",
            "start": ls,
            "end": min(rs + 6, len(bars) - 1),
            "neckline": neckline,
            "quality": q,
            "grade": _grade(q),
            "color": "rgba(216,90,48,0.12)",
            "border_color": "#D85A30",
            "details": f"Head {highs[hd]:.2f}, shoulders {highs[ls]:.2f}/{highs[rs]:.2f}, neckline {neckline:.2f}",
        })
    return patterns


def _detect_inverse_hs(bars: list[dict], lows: list[float]) -> list[dict]:
    patterns = []
    minima = _local_minima(lows, window=3)

    for i in range(len(minima) - 2):
        ls, hd, rs = minima[i], minima[i + 1], minima[i + 2]
        if hd - ls < 4 or rs - hd < 4:
            continue
        if not (lows[hd] < lows[ls] and lows[hd] < lows[rs]):
            continue
        shoulder_diff = abs(lows[ls] - lows[rs]) / lows[ls]
        if shoulder_diff > 0.07:
            continue
        peak1 = max(bars[j]["high"] for j in range(ls, hd + 1))
        peak2 = max(bars[j]["high"] for j in range(hd, rs + 1))
        neckline = (peak1 + peak2) / 2
        q = _quality_score(5.5, [
            (2.5, 1 - shoulder_diff / 0.07),
            (1.0, min(1.0, (lows[ls] - lows[hd]) / (lows[ls] * 0.05))),
            (1.0, 1.0),
        ])
        patterns.append({
            "type": "Inv Head & Shoulders",
            "direction": "BULLISH",
            "start": ls,
            "end": min(rs + 6, len(bars) - 1),
            "neckline": neckline,
            "quality": q,
            "grade": _grade(q),
            "color": "rgba(29,158,117,0.12)",
            "border_color": "#1D9E75",
            "details": f"Head {lows[hd]:.2f}, shoulders {lows[ls]:.2f}/{lows[rs]:.2f}, neckline {neckline:.2f}",
        })
    return patterns


def _detect_ascending_triangle(bars: list[dict], highs: list[float], lows: list[float]) -> list[dict]:
    patterns = []
    n = len(bars)
    window = min(30, n // 3)

    for start in range(0, n - window, window // 2):
        end = min(start + window, n - 1)
        seg_h = highs[start:end + 1]
        seg_l = lows[start:end + 1]
        if len(seg_h) < 8:
            continue
        resistance = max(seg_h)
        resist_touches = sum(1 for h in seg_h if abs(h - resistance) / resistance < 0.015)
        if resist_touches < 2:
            continue
        slope = _trend_slope(seg_l)
        if slope < 0.001:
            continue
        q = _quality_score(5.0, [
            (2.0, min(1.0, resist_touches / 4)),
            (2.0, min(1.0, slope / 0.005)),
            (0.9, 1.0),
        ])
        patterns.append({
            "type": "Ascending Triangle",
            "direction": "BULLISH",
            "start": start,
            "end": end,
            "neckline": resistance,
            "quality": q,
            "grade": _grade(q),
            "color": "rgba(29,158,117,0.10)",
            "border_color": "#0F6E56",
            "details": f"Resistance {resistance:.2f}, rising lows slope {slope*100:.2f}%/bar",
        })
    return patterns


def _detect_descending_triangle(bars: list[dict], highs: list[float], lows: list[float]) -> list[dict]:
    patterns = []
    n = len(bars)
    window = min(30, n // 3)

    for start in range(0, n - window, window // 2):
        end = min(start + window, n - 1)
        seg_h = highs[start:end + 1]
        seg_l = lows[start:end + 1]
        if len(seg_l) < 8:
            continue
        support = min(seg_l)
        support_touches = sum(1 for l in seg_l if abs(l - support) / support < 0.015)
        if support_touches < 2:
            continue
        slope = _trend_slope(seg_h)
        if slope > -0.001:
            continue
        q = _quality_score(5.0, [
            (2.0, min(1.0, support_touches / 4)),
            (2.0, min(1.0, abs(slope) / 0.005)),
            (0.9, 1.0),
        ])
        patterns.append({
            "type": "Descending Triangle",
            "direction": "BEARISH",
            "start": start,
            "end": end,
            "neckline": support,
            "quality": q,
            "grade": _grade(q),
            "color": "rgba(216,90,48,0.10)",
            "border_color": "#993C1D",
            "details": f"Support {support:.2f}, falling highs slope {slope*100:.2f}%/bar",
        })
    return patterns


def _detect_bull_flag(bars: list[dict], closes: list[float]) -> list[dict]:
    patterns = []
    n = len(bars)
    if n < 20:
        return patterns

    for pole_end in range(10, n - 5):
        pole_start = max(0, pole_end - 12)
        pole_move = (closes[pole_end] - closes[pole_start]) / closes[pole_start]
        if pole_move < 0.05:
            continue
        flag_end = min(pole_end + 10, n - 1)
        flag = closes[pole_end:flag_end + 1]
        if len(flag) < 4:
            continue
        flag_slope = _trend_slope(flag)
        if not (-0.008 < flag_slope < 0.002):
            continue
        q = _quality_score(5.0, [
            (2.5, min(1.0, pole_move / 0.12)),
            (2.0, min(1.0, abs(flag_slope + 0.003) / 0.005)),
            (0.5, 1.0),
        ])
        patterns.append({
            "type": "Bull Flag",
            "direction": "BULLISH",
            "start": pole_start,
            "end": flag_end,
            "neckline": max(closes[pole_end:flag_end + 1]),
            "quality": q,
            "grade": _grade(q),
            "color": "rgba(29,158,117,0.10)",
            "border_color": "#1D9E75",
            "details": f"Pole +{pole_move*100:.1f}%, flag slope {flag_slope*100:.2f}%/bar",
        })
        break  # one bull flag per scan
    return patterns


# ─── Main entry point ───────────────────────────────────────────────────────

def detect_patterns(bars: list[dict], max_patterns: int = 5) -> list[dict]:
    """
    Run all detectors on OHLCV bars.
    Returns top patterns sorted by quality descending.
    """
    if len(bars) < 20:
        return []

    c = _closes(bars)
    h = _highs(bars)
    l = _lows(bars)

    all_patterns: list[dict] = []
    all_patterns += _detect_double_bottom(bars, l)
    all_patterns += _detect_double_top(bars, h)
    all_patterns += _detect_head_and_shoulders(bars, h)
    all_patterns += _detect_inverse_hs(bars, l)
    all_patterns += _detect_ascending_triangle(bars, h, l)
    all_patterns += _detect_descending_triangle(bars, h, l)
    all_patterns += _detect_bull_flag(bars, c)

    # de-duplicate overlapping patterns (keep higher quality)
    seen_ranges: list[tuple[int, int, str]] = []
    unique = []
    for pat in sorted(all_patterns, key=lambda p: p["quality"], reverse=True):
        overlap = False
        for s, e, t in seen_ranges:
            if t == pat["type"]:
                continue
            overlap_len = max(0, min(pat["end"], e) - max(pat["start"], s))
            span = max(1, pat["end"] - pat["start"])
            if overlap_len / span > 0.6:
                overlap = True
                break
        if not overlap:
            seen_ranges.append((pat["start"], pat["end"], pat["type"]))
            unique.append(pat)
        if len(unique) >= max_patterns:
            break

    return unique
