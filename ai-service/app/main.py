import hashlib
from typing import Dict, Optional, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np

from app.services.chatbot import FinancialAdvisor
from app.services.explainer import SHAPExplainer
from app.schemas.request import UCICreditRequest, PredictRequestNew, ChatRequest
import joblib
from pathlib import Path
import json

app = FastAPI(
    title="SpendiFy Machine Learning Service",
    description="Microservices API for Credit Scoring, Risk Classification, and Explainable AI.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

advisor = FinancialAdvisor()

# Load models
models_dir = Path(__file__).resolve().parent.parent / "trained_models"
models_loaded = False
try:
    xgb_model = joblib.load(models_dir / "credit_scorer.joblib")
    scaler = joblib.load(models_dir / "scaler.joblib")
    with open(models_dir / "feature_names.json", "r") as f:
        feature_names = json.load(f)
    explainer = SHAPExplainer(model_dir=str(models_dir))
    models_loaded = True
except Exception as e:
    print(f"Error loading models: {e}")

@app.get("/health")
def health():
    return {
        "status": "healthy" if models_loaded else "degraded",
        "service": "SpendiFy AI Service",
        "version": "1.0.0",
        "models_loaded": models_loaded
    }

@app.get("/model/info")
def model_info():
    if not models_loaded:
        raise HTTPException(status_code=503, detail="Models not loaded")
    metrics_path = models_dir / "metrics.json"
    metrics = {}
    if metrics_path.exists():
        with open(metrics_path, "r") as f:
            metrics = json.load(f)
    return {
        "model_name": "XGBoost Classifier",
        "model_version": "1.0.0",
        "training_dataset": "UCI Default of Credit Card Clients",
        "features": feature_names,
        "metrics": metrics
    }

@app.post("/api/ml/predict")
def predict(req: PredictRequestNew):
    if not models_loaded:
        raise HTTPException(status_code=503, detail="Models are not trained or unavailable")
    try:
        # Extract features in the exact order of feature_names
        feature_dict = req.features.model_dump()
        feature_values = [feature_dict[f.lower()] for f in feature_names]
        X = np.array([feature_values])
        
        # Scale
        X_scaled = scaler.transform(X)
        
        # Predict
        default_prob = float(xgb_model.predict_proba(X_scaled)[0, 1])
        
        # Risk Category
        if default_prob > 0.5:
            riskCategory = "HIGH"
        elif default_prob > 0.2:
            riskCategory = "MEDIUM"
        else:
            riskCategory = "LOW"
            
        # Explanations
        explanations = explainer.explain(X_scaled[0])
        shapExplanation = {item["feature_name"]: item["shap_value"] for item in explanations}
        
        # Convert to credit score
        creditScore = int(850 - (default_prob * 500))
        financialHealth = 100 - (default_prob * 100)
        
        isRisky = riskCategory in ["HIGH", "CRITICAL"]
        
        result = {
            "creditScore": creditScore,
            "financialHealth": financialHealth,
            "defaultProbability": default_prob,
            "riskCategory": riskCategory,
            "shapExplanation": shapExplanation,
            "isRisky": isRisky,
            "modelVersion": "1.0.0"
        }
        
        if isRisky:
            suggested_amount = int(req.loanAmount * 0.6)
            suggested_tenure = int(min(24, req.tenureMonths + 6))
            suggested_rate = round(req.interestRate - 1.5, 1)
            
            monthly_rate = suggested_rate / 12.0 / 100.0
            if monthly_rate > 0 and suggested_tenure > 0:
                suggested_emi = (suggested_amount * monthly_rate * pow(1.0 + monthly_rate, suggested_tenure)) / \
                                (pow(1.0 + monthly_rate, suggested_tenure) - 1.0)
            else:
                suggested_emi = 0.0
                
            result["recommendation"] = {
                "suggestedAmount": suggested_amount,
                "suggestedTenure": suggested_tenure,
                "suggestedRate": suggested_rate,
                "suggestedEmi": round(suggested_emi, 2),
                "rationale": f"The requested loan presents elevated risk ({riskCategory}). We suggest a restructured micro-loan of {suggested_amount}."
            }
            
        return result
    except Exception as e:
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
