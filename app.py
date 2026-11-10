from pathlib import Path
import json
import warnings

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, render_template, request

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "wine_quality_classification.pkl"
DATA_PATH = BASE_DIR / "dataset" / "winequalityN.csv"

app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False

# This order is read from the supplied artifact, not guessed.
artifact = joblib.load(MODEL_PATH)
model = artifact["model"]
scaler = artifact["scaler"]
FEATURES = list(artifact["features"])
MODEL_NAME = artifact.get("model_name", type(model).__name__)

df_raw = pd.read_csv(DATA_PATH)
df_clean = df_raw.drop_duplicates().dropna().copy()
df_clean["high_quality"] = (df_clean["quality"] >= 6).astype(int)

# Use observed dataset ranges for UI guidance and server-side validation.
feature_stats = {}
for feature in FEATURES:
    series = pd.to_numeric(df_clean[feature], errors="coerce").dropna()
    feature_stats[feature] = {
        "min": float(series.min()),
        "max": float(series.max()),
        "median": float(series.median()),
        "mean": float(series.mean()),
        "q25": float(series.quantile(0.25)),
        "q75": float(series.quantile(0.75)),
    }

def build_analytics():
    usable = df_clean
    quality_counts = usable["quality"].value_counts().sort_index()
    binary_counts = usable["high_quality"].value_counts().reindex([0, 1], fill_value=0)
    numeric = usable[FEATURES + ["quality"]]
    corr = numeric.corr(numeric_only=True).round(3)
    return {
        "overview": {
            "records": int(len(usable)),
            "raw_records": int(len(df_raw)),
            "features": len(FEATURES),
            "high_quality": int(binary_counts.loc[1]),
            "lower_quality": int(binary_counts.loc[0]),
            "high_quality_pct": round(float(binary_counts.loc[1] / len(usable) * 100), 1),
            "red_wine": int((usable["type"].str.lower() == "red").sum()),
            "white_wine": int((usable["type"].str.lower() == "white").sum()),
            "removed_rows": int(len(df_raw) - len(usable)),
        },
        "quality_distribution": {
            "labels": [str(x) for x in quality_counts.index.tolist()],
            "values": [int(x) for x in quality_counts.values.tolist()],
        },
        "binary_distribution": {
            "labels": ["Lower quality (< 6)", "High quality (≥ 6)"],
            "values": [int(binary_counts.loc[0]), int(binary_counts.loc[1])],
        },
        "alcohol": {
            "labels": ["< 9%", "9–10%", "10–11%", "11–12%", "12–13%", "13%+"],
            "values": [
                int((usable.alcohol < 9).sum()),
                int(((usable.alcohol >= 9) & (usable.alcohol < 10)).sum()),
                int(((usable.alcohol >= 10) & (usable.alcohol < 11)).sum()),
                int(((usable.alcohol >= 11) & (usable.alcohol < 12)).sum()),
                int(((usable.alcohol >= 12) & (usable.alcohol < 13)).sum()),
                int((usable.alcohol >= 13).sum()),
            ],
        },
        "acidity": {
            "labels": ["Fixed acidity", "Volatile acidity", "Citric acid", "pH"],
            "values": [
                round(float(usable["fixed acidity"].median()), 3),
                round(float(usable["volatile acidity"].median()), 3),
                round(float(usable["citric acid"].median()), 3),
                round(float(usable["pH"].median()), 3),
            ],
        },
        "correlation": {
            "labels": FEATURES,
            "matrix": corr.loc[FEATURES, FEATURES].values.tolist(),
        },
        "feature_stats": feature_stats,
        "model": {
            "name": MODEL_NAME,
            "algorithm": type(model).__name__,
            "test_accuracy": 0.7554,
            "test_f1": 0.8105,
            "test_precision": 0.79,
            "test_recall": 0.84,
            "test_size": 1059,
            "feature_importance_supported": hasattr(model, "feature_importances_") or hasattr(model, "coef_"),
            "importance_note": "The supplied KNN model does not expose native feature-importance scores.",
        },
    }

ANALYTICS = build_analytics()

@app.get("/")
def home():
    return render_template(
        "index.html",
        features=FEATURES,
        feature_stats=feature_stats,
        model_name=MODEL_NAME,
        analytics=ANALYTICS,
    )

@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "model": MODEL_NAME,
        "algorithm": type(model).__name__,
        "features": FEATURES,
    })

@app.get("/api/analytics")
def analytics():
    return jsonify(ANALYTICS)

@app.post("/api/predict")
def predict():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Send a JSON object containing all model features."}), 400

    missing = [name for name in FEATURES if name not in payload or payload[name] in (None, "")]
    if missing:
        return jsonify({"error": "Missing required feature values.", "fields": missing}), 400

    values = []
    for name in FEATURES:
        try:
            value = float(payload[name])
        except (TypeError, ValueError):
            return jsonify({"error": f'"{name}" must be a valid number.', "field": name}), 400
        if not np.isfinite(value):
            return jsonify({"error": f'"{name}" must be a finite number.', "field": name}), 400
        low, high = feature_stats[name]["min"], feature_stats[name]["max"]
        if value < low or value > high:
            return jsonify({
                "error": f'"{name}" must be within the observed dataset range ({low:g}–{high:g}).',
                "field": name,
                "min": low,
                "max": high,
            }), 400
        values.append(value)

    try:
        frame = pd.DataFrame([values], columns=FEATURES)
        scaled = scaler.transform(frame)
        prediction = int(model.predict(scaled)[0])
        probability = None
        if hasattr(model, "predict_proba"):
            probability = float(model.predict_proba(scaled)[0][list(model.classes_).index(prediction)])
        return jsonify({
            "prediction": prediction,
            "label": "High quality" if prediction == 1 else "Lower quality",
            "description": (
                "The model classifies this wine as high quality (quality score ≥ 6 in the training target)."
                if prediction == 1 else
                "The model classifies this wine as lower quality (quality score < 6 in the training target)."
            ),
            "confidence": round(probability * 100, 1) if probability is not None else None,
            "model": MODEL_NAME,
        })
    except Exception as exc:
        app.logger.exception("Prediction failed")
        return jsonify({"error": "The model could not process this input. Check the values and try again."}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
