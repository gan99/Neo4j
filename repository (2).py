# --- Simple Dataiku webapp backend ---
import dataiku
import pandas as pd
from flask import request, jsonify

# 👇 CHANGE THIS to a dataset that exists in your project
DATASET_NAME = "YOUR_DATASET_NAME"

@app.route("/ping")
def ping():
    return "ok"

@app.route("/get-sample")
def get_sample():
    """Return first N rows as JSON (defaults to 100)."""
    n = int(request.args.get("n", 100))
    ds = dataiku.Dataset(DATASET_NAME)
    df = ds.get_dataframe(limit=n)

    # Make datetimes JSON-friendly
    for c in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[c]):
            df[c] = df[c].astype(str)

    return jsonify({"rows": df.to_dict(orient="records")})
