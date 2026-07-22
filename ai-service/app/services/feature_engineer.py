import numpy as np
from typing import Any, Dict

class FeatureEngineer:
    """Computes and orders features for the credit scoring and risk classification models."""

    FEATURE_NAMES = [
        "expense_to_income_ratio",
        "debt_to_income_ratio",
        "savings_ratio",
        "annual_income",
        "monthly_income",
        "monthly_expenses",
        "savings",
        "total_debt",
        "credit_utilization",
        "num_credit_accounts",
        "num_loans",
        "payment_history_pct",
        "credit_history_length_months",
        "recent_inquiries",
        "bankruptcies",
        "tax_liens",
        "age",
        "employment_length_months",
        "dependents",
        "monthly_disposable_income",
    ]

    def generate_features(self, financial_summary: Dict[str, Any], additional_data: Dict[str, Any]) -> np.ndarray:
        annual_income = float(financial_summary.get("annual_income", 0.0))
        monthly_income = float(financial_summary.get("monthly_income", 0.0))
        monthly_expenses = float(financial_summary.get("monthly_expenses", 0.0))
        savings = float(financial_summary.get("savings", 0.0))
        total_debt = float(financial_summary.get("total_debt", 0.0))
        credit_utilization = float(financial_summary.get("credit_utilization", 0.0))
        num_credit_accounts = float(financial_summary.get("num_credit_accounts", 0.0))
        num_loans = float(financial_summary.get("num_loans", 0.0))
        payment_history_pct = float(financial_summary.get("payment_history_pct", 0.0))
        credit_history_length_months = float(financial_summary.get("credit_history_length_months", 0.0))
        recent_inquiries = float(financial_summary.get("recent_inquiries", 0.0))
        bankruptcies = float(financial_summary.get("bankruptcies", 0.0))
        tax_liens = float(financial_summary.get("tax_liens", 0.0))

        age = float(additional_data.get("age", 30.0))
        employment_length_months = float(additional_data.get("employment_length_months", 0.0))
        dependents = float(additional_data.get("dependents", 0.0))

        expense_to_income_ratio = monthly_expenses / monthly_income if monthly_income > 0 else 0.0
        debt_to_income_ratio = total_debt / annual_income if annual_income > 0 else 0.0
        savings_ratio = savings / annual_income if annual_income > 0 else 0.0
        monthly_disposable_income = monthly_income - monthly_expenses

        feature_values = {
            "expense_to_income_ratio": expense_to_income_ratio,
            "debt_to_income_ratio": debt_to_income_ratio,
            "savings_ratio": savings_ratio,
            "annual_income": annual_income,
            "monthly_income": monthly_income,
            "monthly_expenses": monthly_expenses,
            "savings": savings,
            "total_debt": total_debt,
            "credit_utilization": credit_utilization,
            "num_credit_accounts": num_credit_accounts,
            "num_loans": num_loans,
            "payment_history_pct": payment_history_pct,
            "credit_history_length_months": credit_history_length_months,
            "recent_inquiries": recent_inquiries,
            "bankruptcies": bankruptcies,
            "tax_liens": tax_liens,
            "age": age,
            "employment_length_months": employment_length_months,
            "dependents": dependents,
            "monthly_disposable_income": monthly_disposable_income,
        }

        return np.array([feature_values[name] for name in self.FEATURE_NAMES], dtype=np.float64)
