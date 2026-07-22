import hashlib
import random
from typing import Dict, Optional, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.services.credit_analysis import CreditAnalysisService
from app.schemas.request import CreditAnalysisRequest
from app.services.chatbot import FinancialAdvisor

app = FastAPI(
    title="SpendiFy Machine Learning Service",
    description="Microservices API for Credit Scoring, Risk Classification, and Explainable AI.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Services
analysis_service = CreditAnalysisService()
advisor = FinancialAdvisor()

# Schemas matching the backend calls
class PredictRequest(BaseModel):
    userId: str
    bankStatementUrl: Optional[str] = None
    loanAmount: float
    tenureMonths: int
    interestRate: float
    emi: float

class ChatRequest(BaseModel):
    userId: str
    message: str
    profile: Optional[Dict[str, Any]] = None

def get_user_mock_metrics(user_id: str, requested_amount: float, requested_emi: float) -> Dict[str, Any]:
    # Stable seed based on user ID for reproducible testing
    seed = int(hashlib.md5(user_id.encode('utf-8')).hexdigest(), 16) & 0xffffffff
    rng = random.Random(seed)
    
    monthly_income = rng.randint(45000, 110000)
    monthly_expenses = int(monthly_income * rng.uniform(0.5, 0.7))
    savings_balance = rng.randint(50000, 300000)
    total_debt = rng.randint(0, 150000)
    credit_utilization = rng.uniform(0.05, 0.45)
    num_active_loans = rng.randint(0, 2)
    num_credit_cards = rng.randint(0, 3)
    payment_history_score = rng.uniform(0.85, 1.0)
    years_of_credit_history = rng.uniform(1.0, 8.0)
    num_hard_inquiries = rng.randint(0, 3)
    employment_type = rng.choice(["salaried", "self_employed", "business", "freelancer"])
    age = rng.randint(22, 45)
    
    return {
        "monthly_income": monthly_income,
        "monthly_expenses": monthly_expenses,
        "savings_balance": savings_balance,
        "total_debt": total_debt,
        "monthly_emi": requested_emi,
        "credit_utilization": credit_utilization,
        "num_active_loans": num_active_loans,
        "num_credit_cards": num_credit_cards,
        "payment_history_score": payment_history_score,
        "years_of_credit_history": years_of_credit_history,
        "num_hard_inquiries": num_hard_inquiries,
        "employment_type": employment_type,
        "age": age
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "SpendiFy AI Service",
        "version": "1.0.0",
        "models_loaded": {
            "credit_scorer": not analysis_service.credit_scorer._using_fallback,
            "risk_classifier": not analysis_service.risk_classifier._using_fallback,
            "default_predictor": not analysis_service.default_predictor._scorer or not analysis_service.default_predictor._scorer._using_fallback,
        }
    }

@app.post("/api/ml/predict")
def predict(req: PredictRequest):
    try:
        metrics = get_user_mock_metrics(req.userId, req.loanAmount, req.emi)
        analysis_req = CreditAnalysisRequest(**metrics)
        res = analysis_service.analyze(analysis_req)
        
        creditScore = res["credit_score"]
        financialHealth = res["financial_health_score"]
        defaultProbability = res["default_probability"]
        riskCategory = res["risk_category"]
        shapExplanation = {item["feature_name"]: item["shap_value"] for item in res["explanations"]}
        isRisky = riskCategory in ["HIGH", "CRITICAL"]
        
        result = {
            "creditScore": creditScore,
            "financialHealth": financialHealth,
            "defaultProbability": defaultProbability,
            "riskCategory": riskCategory,
            "shapExplanation": shapExplanation,
            "isRisky": isRisky
        }
        
        if isRisky:
            suggested_amount = int(req.loanAmount * 0.6)
            suggested_tenure = int(min(24, req.tenureMonths + 6))
            suggested_rate = round(req.interestRate - 1.5, 1)
            
            # Calculate EMI for recommendation
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
                "rationale": f"The requested loan of ₹{req.loanAmount} presents elevated risk ({riskCategory}). We suggest a restructured micro-loan of ₹{suggested_amount} at {suggested_rate}% interest and a {suggested_tenure}-month term to lower the debt-to-income impact."
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
        # Add mock metrics stable context
        metrics = get_user_mock_metrics(req.userId, 0.0, 0.0)
        financial_context.update({
            "annual_income": metrics["monthly_income"] * 12.0,
            "monthly_income": metrics["monthly_income"],
            "monthly_expenses": metrics["monthly_expenses"],
            "total_debt": metrics["total_debt"],
            "savings": metrics["savings_balance"],
            "credit_utilization": metrics["credit_utilization"],
            "recent_inquiries": metrics["num_hard_inquiries"],
            "payment_history_pct": metrics["payment_history_score"],
            "credit_history_length_months": metrics["years_of_credit_history"] * 12.0,
        })
        
        chat_res = advisor.chat(req.message, financial_context)
        return {"reply": chat_res["response"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chatbot error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
