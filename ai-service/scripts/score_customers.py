"""
SpendiFy AI Service - Batch Ledger Customer Scorer.

Evaluates AI Credit Scores, Risk Categories, Default Probabilities, and Financial Health
Scores for all customers in the sample ledger dataset.
"""

import json
from pathlib import Path
import sys

import pandas as pd

# Add parent directory to path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.schemas.request import CreditAnalysisRequest
from app.services.credit_analysis import CreditAnalysisService


def score_ledger_customers(csv_path: Path):
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    df = pd.read_csv(csv_path)
    service = CreditAnalysisService()
    results = []

    for idx, row in df.iterrows():
        request = CreditAnalysisRequest(
            age=int(row["age"]),
            employment_type=str(row["employment_type"]),
            employment_length=float(row["employment_length_months"]),
            education_level="graduate",
            home_ownership="rent",
            monthly_income=float(row["monthly_income"]),
            monthly_expenses=float(row["monthly_expenses"]),
            savings_balance=float(row["savings_balance"]),
            total_debt=float(row["total_debt"]),
            num_active_loans=int(row["num_active_loans"]),
            num_credit_cards=int(row["num_credit_cards"]),
            credit_utilization=float(row["credit_utilization"]),
            payment_history_score=float(row["payment_history_score"]),
            years_of_credit_history=float(row["years_of_credit_history"]),
            num_hard_inquiries=int(row["num_hard_inquiries"]),
            loan_purpose="personal",
            requested_amount=float(row["requested_loan_amount"]),
            requested_tenure_months=int(row["requested_tenure_months"]),
            dependents=float(row.get("dependents", 0.0)),
            bankruptcies=float(row.get("bankruptcies", 0.0)),
            tax_liens=float(row.get("tax_liens", 0.0)),
        )

        res = service.analyze(request)
        results.append({
            "name": row["name"],
            "principal": row["requested_loan_amount"],
            "pmt_history": f"{row['payment_history_score']*100:.0f}%",
            "credit_score": res["credit_score"],
            "risk_category": res["risk_category"],
            "default_prob": f"{res['default_probability']*100:.1f}%",
            "health_score": f"{res['financial_health_score']:.1f}/100",
            "summary": res["summary"],
            "top_tip": res["improvement_suggestions"][0] if res["improvement_suggestions"] else ""
        })

    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    csv_file = Path(__file__).resolve().parent.parent.parent / "data" / "sample_offline_customers.csv"
    score_ledger_customers(csv_file)
