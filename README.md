<<<<<<< HEAD
# Wine_Quality_Classification
Wine_Quality_Classification_UI
=======
# Wine Quality Classification

A premium editorial-style Flask application powered by your supplied K-Nearest Neighbors model.

## What the supplied model does

- **Task:** binary classification, not a 0–10 score prediction.
- **Target definition from the notebook:** `high_quality = 1` when `quality >= 6`, otherwise `0`.
- **Saved model:** K-Nearest Neighbors (`KNeighborsClassifier`).
- **Preprocessing:** the saved `StandardScaler` is applied before prediction.
- **Exact model input order:**
  1. `alcohol`
  2. `volatile acidity`
  3. `citric acid`
  4. `residual sugar`
  5. `chlorides`
  6. `free sulfur dioxide`
  7. `total sulfur dioxide`
  8. `pH`

The app reads the feature list from the `.pkl` artifact and uses that exact order. It does not retrain or modify your model.

## Dataset and analytics

The app reads `dataset/winequalityN.csv`. Dataset analytics use the notebook's cleaning sequence: remove duplicate rows, then drop rows containing missing values. The supplied CSV has 6,497 raw rows; this cleaning leaves 5,295 rows. Charts are generated from the CSV at runtime.

The saved notebook reports the selected KNN model's test accuracy as **75.54%** and F1-score as **0.8105** on its 1,059-row test split. These are the notebook's recorded evaluation results, not metrics recalculated by the website. KNN does not provide native `feature_importances_` or coefficient scores, so the app deliberately does not invent a feature-importance chart.

## Run locally (Windows PowerShell)

```powershell
cd Wine_Quality_Classification
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

Open **http://127.0.0.1:5000**.

## API

- `GET /api/health` — model and feature health check.
- `GET /api/analytics` — dataset-backed analytics for charts.
- `POST /api/predict` — accepts a JSON object with all eight features.

Example:

```json
{
  "alcohol": 10.4,
  "volatile acidity": 0.30,
  "citric acid": 0.31,
  "residual sugar": 2.7,
  "chlorides": 0.047,
  "free sulfur dioxide": 28,
  "total sulfur dioxide": 116,
  "pH": 3.21
}
```

The API rejects missing, non-numeric, non-finite, and out-of-observed-dataset-range values. A probability-like confidence is returned when supported by the model; interpret it as the model's estimated class probability, not a calibrated guarantee.

## Notes

- Internet access is needed in the browser for the Google Fonts, Chart.js and GSAP CDN assets. The prediction backend and dataset are local.
- The pickle file is loaded with scikit-learn **1.6.1**, the version recorded by the artifact's unpickling warning. Pickle/joblib files should only be loaded from trusted sources.
- This is an educational ML demonstration, not professional wine grading or laboratory analysis.
>>>>>>> 80128ff (Initial commit)
