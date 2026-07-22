"""
Credit Analysis Service for SpendiFy AI.

Orchestrates the full credit analysis pipeline: feature engineering,
credit scoring, risk classification, default prediction, SHAP-based
explainability, and financial health assessment.
"""

from __future__ import annotations

import logging
from typing import Any

from app.models.credit_scorer import CreditScorer
from app.models.risk_classifier import RiskClassifier
from app.models.default_predictor import DefaultPredictor
from app.services.feature_engineer import FeatureEngineer
from app.services.explainer import SHAPExplainer
from app.schemas.request import CreditAnalysisRequest

logger = logging.getLogger(__name__)


class CreditAnalysisService:
    """End-to-end credit analysis pipeline.

    Combines multiple ML models and heuristic engines to produce a
    comprehensive credit assessment including score, risk level,
    default probability, feature explanations, and improvement tips.
    """

    def __init__(self) -> None:
        """Initialize all sub-components of the credit analysis pipeline."""
        logger.info("Initializing CreditAnalysisService components...")
        self.credit_scorer = CreditScorer()
        self.risk_classifier = RiskClassifier()
        self.default_predictor = DefaultPredictor()
        self.feature_engineer = FeatureEngineer()
        self.explainer = SHAPExplainer()
        logger.info("CreditAnalysisService initialized successfully.")

    def analyze(self, data: CreditAnalysisRequest) -> dict[str, Any]:
        """Run the full credit analysis pipeline.

        Args:
            data: A validated CreditAnalysisRequest containing the
                applicant's financial and demographic information.

        Returns:
            A dict compatible with CreditScoreResponse, containing:
            - credit_score (int)
            - risk_category (str)
            - default_probability (float)
            - financial_health_score (float)
            - explanations (list[dict])
            - improvement_suggestions (list[str])
            - summary (str)
        """
        logger.info("Starting credit analysis for request.")

        # ------------------------------------------------------------------
        # 1. Build the financial summary consumed by models
        # ------------------------------------------------------------------
        # ------------------------------------------------------------------
        # 1. Build the financial summary consumed by models
        # ------------------------------------------------------------------
        financial_summary: dict[str, Any] = {
            "annual_income": data.monthly_income * 12.0,
            "monthly_income": data.monthly_income,
            "monthly_expenses": data.monthly_expenses,
            "total_debt": data.total_debt,
            "savings": data.savings_balance,
            "credit_utilization": data.credit_utilization,
            "num_credit_accounts": data.num_credit_cards,
            "num_loans": data.num_active_loans,
            "payment_history_pct": data.payment_history_score,
            "credit_history_length_months": data.years_of_credit_history * 12.0,
            "recent_inquiries": data.num_hard_inquiries,
            "bankruptcies": getattr(data, "bankruptcies", 0.0),
            "tax_liens": getattr(data, "tax_liens", 0.0),
        }

        additional_data: dict[str, Any] = {
            "age": data.age,
            "employment_status": data.employment_type,
            "employment_length_months": getattr(data, "employment_length", 24.0),
            "education_level": getattr(data, "education_level", "graduate"),
            "home_ownership": getattr(data, "home_ownership", "rent"),
            "loan_purpose": getattr(data, "loan_purpose", "personal"),
            "dependents": getattr(data, "dependents", 0.0),
        }

        # ------------------------------------------------------------------
        # 2. Feature engineering
        # ------------------------------------------------------------------
        features = self.feature_engineer.generate_features(
            financial_summary, additional_data
        )

        # ------------------------------------------------------------------
        # 3. Credit score (300-900 range, CIBIL-compatible)
        # ------------------------------------------------------------------
        credit_scorer_result = self.credit_scorer.predict(features)
        credit_score: int = int(credit_scorer_result["score"])

        # ------------------------------------------------------------------
        # 4. Risk classification
        # ------------------------------------------------------------------
        risk_category: str = self.risk_classifier.classify(features)
        risk_probs: dict[str, float] = self.risk_classifier.get_probabilities(features)
        risk_probability: float = risk_probs.get(risk_category.lower(), 0.5)

        # ------------------------------------------------------------------
        # 5. Default prediction
        # ------------------------------------------------------------------
        default_result: dict[str, Any] = self.default_predictor.predict_with_confidence(features)
        default_probability: float = default_result.get("probability", 0.0)

        # ------------------------------------------------------------------
        # 6. SHAP explanations
        # ------------------------------------------------------------------
        explanations: list[dict[str, Any]] = self.explainer.explain(features)

        # ------------------------------------------------------------------
        # 7. Improvement suggestions
        # ------------------------------------------------------------------
        improvement_suggestions: list[str] = self.explainer.get_improvement_suggestions(
            explanations, features
        )

        # ------------------------------------------------------------------
        # 8. Financial health score
        # ------------------------------------------------------------------
        financial_health_score: float = self.calculate_financial_health_score(
            financial_summary
        )

        # ------------------------------------------------------------------
        # 9. Build human-readable summary
        # ------------------------------------------------------------------
        summary = self._build_summary(
            credit_score,
            risk_category,
            default_probability,
            financial_health_score,
        )

        response: dict[str, Any] = {
            "credit_score": credit_score,
            "risk_category": risk_category,
            "risk_probability": round(risk_probability, 4),
            "default_probability": round(default_probability, 4),
            "financial_health_score": round(financial_health_score, 2),
            "explanations": explanations,
            "improvement_suggestions": improvement_suggestions,
            "summary": summary,
        }

        logger.info(
            "Credit analysis complete — score=%d, risk=%s, default_prob=%.4f",
            credit_score,
            risk_category,
            default_probability,
        )
        return response

    # ------------------------------------------------------------------
    # Financial health score
    # ------------------------------------------------------------------
    def calculate_financial_health_score(
        self, data: dict[str, Any]
    ) -> float:
        """Calculate a 0-100 financial health score.

        The score is a weighted composite of five financial dimensions:

        * **Savings ratio** (25 pts) — savings / annual_income
        * **Debt ratio** (25 pts) — total_debt / annual_income (lower is better)
        * **Payment history** (25 pts) — on-time payment percentage
        * **Credit utilization** (15 pts) — revolving utilization (lower is better)
        * **Credit history length** (10 pts) — months of credit history

        Args:
            data: Dictionary with keys ``annual_income``, ``savings``,
                ``total_debt``, ``payment_history_pct``,
                ``credit_utilization``, ``credit_history_length_months``.

        Returns:
            A float in [0, 100] representing overall financial health.
        """
        score: float = 0.0

        annual_income: float = max(data.get("annual_income", 1), 1)
        savings: float = max(data.get("savings", 0), 0)
        total_debt: float = max(data.get("total_debt", 0), 0)
        payment_history_pct: float = data.get("payment_history_pct", 0.0)
        credit_utilization: float = data.get("credit_utilization", 1.0)
        credit_history_months: int = data.get("credit_history_length_months", 0)

        # 1. Savings ratio — 25 points
        savings_ratio = savings / annual_income
        if savings_ratio >= 0.20:
            score += 25.0
        elif savings_ratio >= 0.10:
            score += 15.0 + 10.0 * ((savings_ratio - 0.10) / 0.10)
        elif savings_ratio >= 0.05:
            score += 8.0 + 7.0 * ((savings_ratio - 0.05) / 0.05)
        else:
            score += 8.0 * (savings_ratio / 0.05)

        # 2. Debt ratio — 25 points (lower debt-to-income is better)
        debt_ratio = total_debt / annual_income
        if debt_ratio <= 0.10:
            score += 25.0
        elif debt_ratio <= 0.30:
            score += 18.0 + 7.0 * ((0.30 - debt_ratio) / 0.20)
        elif debt_ratio <= 0.50:
            score += 10.0 + 8.0 * ((0.50 - debt_ratio) / 0.20)
        elif debt_ratio <= 1.0:
            score += 10.0 * ((1.0 - debt_ratio) / 0.50)
        # debt_ratio > 1.0 contributes 0

        # 3. Payment history — 25 points
        pmt_pct = min(max(payment_history_pct, 0.0), 1.0)
        if pmt_pct >= 0.99:
            score += 25.0
        elif pmt_pct >= 0.95:
            score += 20.0 + 5.0 * ((pmt_pct - 0.95) / 0.04)
        elif pmt_pct >= 0.85:
            score += 12.0 + 8.0 * ((pmt_pct - 0.85) / 0.10)
        elif pmt_pct >= 0.70:
            score += 5.0 + 7.0 * ((pmt_pct - 0.70) / 0.15)
        else:
            score += 5.0 * (pmt_pct / 0.70)

        # 4. Credit utilization — 15 points (lower is better)
        util = min(max(credit_utilization, 0.0), 1.0)
        if util <= 0.10:
            score += 15.0
        elif util <= 0.30:
            score += 12.0 + 3.0 * ((0.30 - util) / 0.20)
        elif util <= 0.50:
            score += 7.0 + 5.0 * ((0.50 - util) / 0.20)
        elif util <= 0.75:
            score += 3.0 + 4.0 * ((0.75 - util) / 0.25)
        else:
            score += 3.0 * ((1.0 - util) / 0.25)

        # 5. Credit history length — 10 points
        if credit_history_months >= 120:
            score += 10.0
        elif credit_history_months >= 60:
            score += 7.0 + 3.0 * ((credit_history_months - 60) / 60.0)
        elif credit_history_months >= 24:
            score += 4.0 + 3.0 * ((credit_history_months - 24) / 36.0)
        else:
            score += 4.0 * (credit_history_months / 24.0)

        return round(min(max(score, 0.0), 100.0), 2)

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------
    @staticmethod
    def _build_summary(
        credit_score: int,
        risk_category: str,
        default_probability: float,
        financial_health_score: float,
    ) -> str:
        """Build a concise human-readable analysis summary.

        Args:
            credit_score: CIBIL-range credit score (300-900).
            risk_category: HIGH / MEDIUM / LOW.
            default_probability: Probability of default in [0, 1].
            financial_health_score: Composite health score in [0, 100].

        Returns:
            A formatted summary string.
        """
        if credit_score >= 750:
            score_label = "Excellent"
        elif credit_score >= 650:
            score_label = "Good"
        elif credit_score >= 550:
            score_label = "Fair"
        else:
            score_label = "Poor"

        if financial_health_score >= 80:
            health_label = "strong"
        elif financial_health_score >= 60:
            health_label = "moderate"
        elif financial_health_score >= 40:
            health_label = "below average"
        else:
            health_label = "weak"

        return (
            f"Your credit score is {credit_score} ({score_label}), "
            f"placing you in the {risk_category} risk category with a "
            f"{default_probability:.1%} probability of default. "
            f"Your overall financial health is {health_label} "
            f"({financial_health_score:.1f}/100)."
        )
