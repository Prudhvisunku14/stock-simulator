import pandas as pd
from typing import List

def candles_to_dataframe(candles_list: list) -> pd.DataFrame:
    """Converts a list of Pydantic Candle models to a Pandas DataFrame."""
    # Convert list of objects to list of dicts directly
    df = pd.DataFrame([c.model_dump() for c in candles_list])
    return df
