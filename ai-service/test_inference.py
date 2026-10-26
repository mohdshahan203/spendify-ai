"""
AI Service Model & SHAP Inference Test Script
Directly loads trained artifacts and tests XGBoost / Random Forest inference + TreeExplainer SHAP values.
"""

import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
import json
import joblib
import numpy as np
import shap

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "trained_models")

print("==================================================")
print("     AI/ML SERVICE INFERENCE & SHAP TEST          ")
print("==================================================")

# 1. Load artifacts
print("[1] Loading models and scaler...")
scorer = joblib.load(os.path.join(MODELS_DIR, "credit_scorer.joblib"))
classifier = joblib.load(os.path.join(MODELS_DIR, "risk_classifier.joblib"))
scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.joblib"))
with open(os.path.join(MODELS_DIR, "feature_names.json"), "r") as f:
    feature_names = json.load(f)

print(f"    Loaded {len(feature_names)} features successfully.")

# 2. Test input vector (Sample prime borrower with no payment delays)
# LIMIT_BAL=150000, SEX=1, EDUCATION=1, MARRIAGE=2, AGE=32, PAY_0 to PAY_6 = 0 or -1 (no delays)
prime_features = [
    150000, 1, 1, 2, 32,
    0, 0, 0, 0, 0, 0,
    25000, 24000, 22000, 20000, 18000, 15000,
    3000, 3000, 3000, 2500, 2500, 2000
]

X_raw = np.array([prime_features])
X_scaled = scaler.transform(X_raw)

# Inference
prob_default = float(classifier.predict_proba(X_scaled)[0, 1])
credit_score = int(np.clip(300 + (1.0 - prob_default) * 600, 300, 900))

print(f"\n[2] Model Inference Results for Prime Borrower:")
print(f"    Default Probability: {prob_default * 100:.2f}%")
print(f"    SpendiFy Credit Score: {credit_score} / 900")
print(f"    Risk Tier: {'LOW' if prob_default < 0.25 else 'MEDIUM' if prob_default < 0.50 else 'HIGH'}")

assert credit_score > 650, f"Expected prime score > 650, got {credit_score}"
print("    [PASS] Credit scoring logic verified.")

# 3. Test SHAP Explainer
print("\n[3] Generating real TreeExplainer SHAP values...")
explainer = shap.TreeExplainer(classifier)
shap_values = explainer.shap_values(X_scaled)

if isinstance(shap_values, list):
    shap_vals = shap_values[1][0]
elif len(shap_values.shape) == 3:
    shap_vals = shap_values[0, :, 1]
else:
    shap_vals = shap_values[0]

top_indices = np.argsort(np.abs(shap_vals))[::-1][:5]
print("    Top 5 SHAP Feature Influences:")
for idx in top_indices:
    feat = feature_names[idx]
    impact = float(shap_vals[idx])
    direction = "Increases Risk" if impact > 0 else "Lowers Risk"
    print(f"    - {feat:10s}: SHAP value = {impact:+.4f} ({direction})")

assert len(shap_vals) == len(feature_names), "SHAP length matches feature length"
print("\n[PASS] SHAP TreeExplainer inference PASSED!")
print("==================================================")
