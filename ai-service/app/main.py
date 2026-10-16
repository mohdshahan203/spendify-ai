import hashlib
from typing import Dict, Optional, Any, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import logging
from pathlib import Path
import json
import joblib

from app.services.chatbot import FinancialAdvisor
from app.services.explainer import SHAPExplainer
from app.schemas.request import UCICreditRequest, PredictRequestNew, ChatRequest

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("spendify-ml-service")

app = FastAPI(
    title="SpendiFy Machine Learning Service",
    description="Microservices API for Credit Scoring, Risk Classification, and Explainable AI.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

advisor = FinancialAdvisor()

# Load models and preprocessing artifacts
models_dir = Path(__file__).resolve().parent.parent / "trained_models"
models_loaded = False
xgb_model = None
rf_model = None
scaler = None
feature_names: List[str] = []
explainer = None
feature_importance = {}
metrics_data = {}

try:
    if (models_dir / "credit_scorer.joblib").exists():
        xgb_model = joblib.load(models_dir / "credit_scorer.joblib")
    if (models_dir / "risk_classifier.joblib").exists():
        rf_model = joblib.load(models_dir / "risk_classifier.joblib")
    if (models_dir / "scaler.joblib").exists():
        scaler = joblib.load(models_dir / "scaler.joblib")
    if (models_dir / "feature_names.json").exists():
        with open(models_dir / "feature_names.json", "r") as f:
            feature_names = json.load(f)
    if (models_dir / "feature_importance.json").exists():
        with open(models_dir / "feature_importance.json", "r") as f:
            feature_importance = json.load(f)
    if (models_dir / "metrics.json").exists():
        with open(models_dir / "metrics.json", "r") as f:
            metrics_data = json.load(f)
            
    explainer = SHAPExplainer(model_dir=str(models_dir))
    models_loaded = bool(xgb_model and scaler and feature_names)
    logger.info(f"Models successfully loaded: XGBoost={bool(xgb_model)}, RF={bool(rf_model)}, Scaler={bool(scaler)}, Features={len(feature_names)}")
except Exception as e:
    logger.error(f"Error loading models: {e}")

@app.get("/health")
def health():
    return {
        "status": "healthy" if models_loaded else "degraded",
        "service": "SpendiFy AI Service",
        "version": "2.0.0",
        "models_loaded": models_loaded,
        "features_count": len(feature_names)
    }

@app.get("/model/info")
def model_info():
    if not models_loaded:
        raise HTTPException(status_code=503, detail="Models not loaded")
    return {
        "model_name": "XGBoost Classifier (Class-Weighted)",
        "model_version": metrics_data.get("model_version", "2.0.0"),
        "training_dataset": "UCI Default of Credit Card Clients",
        "deployed_model": "xgboost",
        "training_timestamp": metrics_data.get("training_timestamp"),
        "features": feature_names,
        "feature_descriptions": metrics_data.get("feature_descriptions", {}),
        "feature_importance": feature_importance,
        "metrics": metrics_data,
        "dataset_limitations": metrics_data.get("dataset_limitations", "")
    }

@app.get("/api/ml/features")
def get_features():
    return {
        "features": feature_names,
        "descriptions": metrics_data.get("feature_descriptions", {}),
        "sample_defaults": {
            "limit_bal": 50000.0,
            "sex": 1,
            "education": 2,
            "marriage": 1,
            "age": 30,
            "pay_0": 0, "pay_2": 0, "pay_3": 0, "pay_4": 0, "pay_5": 0, "pay_6": 0,
            "bill_amt1": 12000.0, "bill_amt2": 11500.0, "bill_amt3": 10000.0,
            "bill_amt4": 9500.0, "bill_amt5": 8000.0, "bill_amt6": 7500.0,
            "pay_amt1": 1500.0, "pay_amt2": 1500.0, "pay_amt3": 1200.0,
            "pay_amt4": 1000.0, "pay_amt5": 1000.0, "pay_amt6": 1000.0
        }
    }

@app.post("/api/ml/predict")
def predict(req: PredictRequestNew):
    if not models_loaded:
        raise HTTPException(status_code=503, detail="Models are not trained or unavailable")
    try:
        # Extract features in the exact order of feature_names
        feature_dict = req.features.model_dump()
        feature_values = [float(feature_dict[f.lower()]) for f in feature_names]
        X = np.array([feature_values])
        
        # Scale features
        X_scaled = scaler.transform(X)
        
        # Predict probability of default
        default_prob = float(xgb_model.predict_proba(X_scaled)[0, 1])
        
        # Risk Category classification
        if default_prob >= 0.60:
            riskCategory = "CRITICAL"
        elif default_prob >= 0.40:
            riskCategory = "HIGH"
        elif default_prob >= 0.20:
            riskCategory = "MEDIUM"
        else:
            riskCategory = "LOW"
            
        # Real SHAP Explanations using TreeExplainer
        explanations = explainer.explain(X_scaled[0])
        shapExplanation = {item["feature_name"]: item["shap_value"] for item in explanations}
        
        # Scaled scores
        creditScore = int(np.clip(850 - (default_prob * 500), 300, 850))
        financialHealth = round(float(np.clip(100 - (default_prob * 100), 0, 100)), 1)
        
        isRisky = riskCategory in ["HIGH", "CRITICAL"]
        
        logger.info(f"Inference evaluated: score={creditScore}, default_prob={default_prob:.3f}, tier={riskCategory}")
        
        result = {
            "creditScore": creditScore,
            "financialHealth": financialHealth,
            "defaultProbability": round(default_prob, 4),
            "riskCategory": riskCategory,
            "shapExplanation": shapExplanation,
            "topImpactFeatures": explanations[:5],
            "isRisky": isRisky,
            "modelVersion": "2.0.0",
            "modelUsed": "XGBoost Classifier (Class-Weighted)"
        }
        
        if isRisky:
            suggested_amount = int(req.loanAmount * 0.7)
            suggested_tenure = int(min(36, req.tenureMonths + 6))
            suggested_rate = round(max(9.5, req.interestRate - 1.5), 1)
            
            monthly_rate = suggested_rate / 12.0 / 100.0
            if monthly_rate > 0 and suggested_tenure > 0:
                suggested_emi = (suggested_amount * monthly_rate * pow(1.0 + monthly_rate, suggested_tenure)) / \
                                (pow(1.0 + monthly_rate, suggested_tenure) - 1.0)
            else:
                suggested_emi = suggested_amount / suggested_tenure if suggested_tenure > 0 else 0.0
                
            result["recommendation"] = {
                "suggestedAmount": suggested_amount,
                "suggestedTenure": suggested_tenure,
                "suggestedRate": suggested_rate,
                "suggestedEmi": round(suggested_emi, 2),
                "rationale": f"Application scored as {riskCategory} risk (Estimated Default Prob: {default_prob*100:.1f}%). Restructured loan proposal lowers monthly burden."
            }
            
        return result
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/api/ml/chat")
def chat(req: ChatRequest):
    try:
        profile = req.profile or {}
        financial_context = {
            "credit_score": profile.get("creditScore") or 0,
            "has_active_loan": profile.get("hasActiveLoan") or False,
            "active_loan_amount": profile.get("activeLoanAmount") or 0,
            "risk_category": profile.get("latestLoanStatus") or "UNKNOWN",
        }
        chat_res = advisor.chat(req.message, financial_context)
        return {"reply": chat_res["response"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chatbot error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
