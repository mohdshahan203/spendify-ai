"""
SHAP Explainer Service for SpendiFy AI.

Provides model-agnostic explainability via SHAP TreeExplainer when an
XGBoost model is available, falling back to heuristic feature-deviation
analysis otherwise. Also generates actionable improvement suggestions
based on the most impactful negative factors.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

# Ideal (healthy) reference values for each feature — used by the
# heuristic fallback when the SHAP explainer is unavailable.
_IDEAL_VALUES: dict[str, float] = {
    "annual_income": 800_000.0,
    "monthly_income": 66_667.0,
    "monthly_expenses": 25_000.0,
    "savings": 300_000.0,
    "total_debt": 100_000.0,
    "credit_utilization": 0.20,
    "num_credit_accounts": 3.0,
    "num_loans": 1.0,
    "payment_history_pct": 0.98,
    "credit_history_length_months": 84.0,
    "recent_inquiries": 1.0,
    "bankruptcies": 0.0,
    "tax_liens": 0.0,
    "debt_to_income_ratio": 0.15,
    "savings_ratio": 0.25,
    "expense_to_income_ratio": 0.40,
    "age": 35.0,
    "employment_length_months": 48.0,
    "dependents": 1.0,
    "monthly_disposable_income": 30_000.0,
}

# Human-readable names for features
_FEATURE_DISPLAY: dict[str, str] = {
    "annual_income": "Annual Income",
    "monthly_income": "Monthly Income",
    "monthly_expenses": "Monthly Expenses",
    "savings": "Total Savings",
    "total_debt": "Total Debt",
    "credit_utilization": "Credit Utilization",
    "num_credit_accounts": "Number of Credit Accounts",
    "num_loans": "Number of Active Loans",
    "payment_history_pct": "Payment History",
    "credit_history_length_months": "Credit History Length",
    "recent_inquiries": "Recent Credit Inquiries",
    "bankruptcies": "Bankruptcies",
    "tax_liens": "Tax Liens",
    "debt_to_income_ratio": "Debt-to-Income Ratio",
    "savings_ratio": "Savings Ratio",
    "expense_to_income_ratio": "Expense-to-Income Ratio",
    "age": "Age",
    "employment_length_months": "Employment Tenure",
    "dependents": "Number of Dependents",
    "monthly_disposable_income": "Monthly Disposable Income",
}


class SHAPExplainer:
    """SHAP-based model explainer with heuristic fallback.

    Attempts to load a persisted XGBoost model and create a
    ``shap.TreeExplainer``. If the model or shap library is unavailable
    the class degrades gracefully to a deviation-based heuristic.
    """

    def __init__(self, model_dir: str = "trained_models") -> None:
        """Load the XGBoost model and SHAP explainer.

        Args:
            model_dir: Directory containing the serialised model file
                (``credit_model.json``) and optional ``feature_names.json``.
        """
        self.model: Any | None = None
        self.explainer: Any | None = None
        self.feature_names: list[str] = []

        model_path = Path(model_dir) / "credit_model.json"
        feature_names_path = Path(model_dir) / "feature_names.json"

        # --- Load feature names -------------------------------------------
        if feature_names_path.exists():
            try:
                with open(feature_names_path, "r", encoding="utf-8") as fh:
                    self.feature_names = json.load(fh)
                logger.info(
                    "Loaded %d feature names from %s",
                    len(self.feature_names),
                    feature_names_path,
                )
            except (json.JSONDecodeError, OSError) as exc:
                logger.warning("Failed to load feature names: %s", exc)

        if not self.feature_names:
            # Fallback: use canonical ordering from FeatureEngineer
            try:
                from app.services.feature_engineer import FeatureEngineer

                self.feature_names = list(FeatureEngineer.FEATURE_NAMES)
                logger.info(
                    "Using FeatureEngineer.FEATURE_NAMES (%d features).",
                    len(self.feature_names),
                )
            except ImportError:
                self.feature_names = list(_IDEAL_VALUES.keys())
                logger.warning(
                    "FeatureEngineer unavailable; using built-in feature list."
                )

        # --- Load XGBoost model -------------------------------------------
        if model_path.exists():
            try:
                import xgboost as xgb

                self.model = xgb.Booster()
                self.model.load_model(str(model_path))
                logger.info("XGBoost model loaded from %s", model_path)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Could not load XGBoost model: %s", exc)
                self.model = None

        # --- Create SHAP TreeExplainer ------------------------------------
        if self.model is not None:
            try:
                import shap

                self.explainer = shap.TreeExplainer(self.model)
                logger.info("SHAP TreeExplainer created successfully.")
            except Exception as exc:  # noqa: BLE001
                logger.warning("Could not create SHAP explainer: %s", exc)
                self.explainer = None
        else:
            logger.info(
                "No model available — SHAP explainer will use heuristic fallback."
            )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def explain(self, features: np.ndarray) -> list[dict[str, Any]]:
        """Generate feature-level explanations for a prediction.

        Uses SHAP values when the TreeExplainer is available; otherwise
        falls back to a heuristic that measures deviations from ideal
        reference values.

        Args:
            features: 1-D or 2-D numpy array of engineered features
                (shape ``(n_features,)`` or ``(1, n_features)``).

        Returns:
            A list of up to 10 explanation dicts sorted by descending
            absolute SHAP value, each containing:
            ``feature_name``, ``feature_value``, ``shap_value``,
            ``impact`` (``positive`` | ``negative``), ``description``.
        """
        feature_vec = features.flatten()

        if self.explainer is not None:
            return self._shap_explain(feature_vec)
        return self._heuristic_explain(feature_vec)

    def get_improvement_suggestions(
        self,
        explanations: list[dict[str, Any]],
        features: np.ndarray,
    ) -> list[str]:
        """Generate actionable improvement suggestions.

        Examines the explanations with ``negative`` impact and
        produces up to 5 concrete, India-context-aware tips.

        Args:
            explanations: Output of :meth:`explain`.
            features: The feature vector (used for contextual thresholds).

        Returns:
            A list of up to 5 suggestion strings.
        """
        feature_vec = features.flatten()
        feature_map: dict[str, float] = {}
        for idx, name in enumerate(self.feature_names):
            if idx < len(feature_vec):
                feature_map[name] = float(feature_vec[idx])

        negative_factors = [
            e for e in explanations if e.get("impact") == "negative"
        ]

        suggestions: list[str] = []

        for factor in negative_factors:
            name = factor["feature_name"]
            value = factor["feature_value"]
            tip = self._suggestion_for(name, value, feature_map)
            if tip and tip not in suggestions:
                suggestions.append(tip)
            if len(suggestions) >= 5:
                break

        # Pad with generic advice if fewer than 5 tips
        generic = [
            "Set up automatic payments (auto-debit) to avoid missing EMI due dates.",
            "Maintain credit utilization below 30% of your sanctioned limit.",
            "Avoid applying for multiple credit products within a short period.",
            "Build an emergency fund covering at least 6 months of expenses.",
            "Review your CIBIL report annually and dispute any inaccuracies.",
        ]
        for tip in generic:
            if tip not in suggestions and len(suggestions) < 5:
                suggestions.append(tip)

        return suggestions[:5]

    # ------------------------------------------------------------------
    # SHAP-based explanation
    # ------------------------------------------------------------------

    def _shap_explain(self, feature_vec: np.ndarray) -> list[dict[str, Any]]:
        """Compute SHAP values and return top-10 explanations."""
        import xgboost as xgb

        dmatrix = xgb.DMatrix(
            feature_vec.reshape(1, -1), feature_names=self.feature_names
        )
        shap_values = self.explainer.shap_values(dmatrix)

        if isinstance(shap_values, list):
            shap_values = shap_values[0]
        shap_arr: np.ndarray = np.asarray(shap_values).flatten()

        explanations: list[dict[str, Any]] = []
        for idx in range(min(len(shap_arr), len(self.feature_names))):
            name = self.feature_names[idx]
            sv = float(shap_arr[idx])
            fv = float(feature_vec[idx]) if idx < len(feature_vec) else 0.0
            impact = "positive" if sv >= 0 else "negative"
            explanations.append(
                {
                    "feature_name": name,
                    "feature_value": round(fv, 4),
                    "shap_value": round(sv, 6),
                    "impact": impact,
                    "description": self._generate_description(name, fv, impact),
                }
            )

        explanations.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        return explanations[:10]

    # ------------------------------------------------------------------
    # Heuristic fallback
    # ------------------------------------------------------------------

    def _heuristic_explain(
        self, feature_vec: np.ndarray
    ) -> list[dict[str, Any]]:
        """Deviation-based heuristic when SHAP is unavailable."""
        explanations: list[dict[str, Any]] = []

        for idx, name in enumerate(self.feature_names):
            fv = float(feature_vec[idx]) if idx < len(feature_vec) else 0.0
            ideal = _IDEAL_VALUES.get(name, 0.0)

            # Features where *higher* is worse
            inverse_features = {
                "total_debt",
                "credit_utilization",
                "num_loans",
                "recent_inquiries",
                "bankruptcies",
                "tax_liens",
                "monthly_expenses",
                "debt_to_income_ratio",
                "expense_to_income_ratio",
                "dependents",
            }

            if ideal != 0:
                deviation = (fv - ideal) / abs(ideal)
            else:
                deviation = fv  # any positive value is a deviation from 0

            if name in inverse_features:
                pseudo_shap = -deviation
            else:
                pseudo_shap = deviation

            # Clamp extreme pseudo-SHAP values for readability
            pseudo_shap = max(min(pseudo_shap, 5.0), -5.0)

            impact = "positive" if pseudo_shap >= 0 else "negative"
            explanations.append(
                {
                    "feature_name": name,
                    "feature_value": round(fv, 4),
                    "shap_value": round(pseudo_shap, 6),
                    "impact": impact,
                    "description": self._generate_description(name, fv, impact),
                }
            )

        explanations.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        return explanations[:10]

    # ------------------------------------------------------------------
    # Description generator
    # ------------------------------------------------------------------

    @staticmethod
    def _generate_description(
        feature_name: str, feature_value: float, impact: str
    ) -> str:
        """Generate a human-readable description for a feature contribution.

        Args:
            feature_name: Internal feature name (snake_case).
            feature_value: Numeric value of the feature.
            impact: ``"positive"`` or ``"negative"``.

        Returns:
            A concise, jargon-free sentence explaining the feature's
            effect on the credit assessment.
        """
        positive = impact == "positive"
        v = feature_value

        descriptions: dict[str, str] = {
            "annual_income": (
                f"Your annual income of ₹{v:,.0f} strengthens your repayment capacity."
                if positive
                else f"Your annual income of ₹{v:,.0f} is below the recommended threshold, limiting your borrowing capacity."
            ),
            "monthly_income": (
                f"A monthly income of ₹{v:,.0f} supports comfortable EMI servicing."
                if positive
                else f"A monthly income of ₹{v:,.0f} may make it difficult to service additional EMIs."
            ),
            "monthly_expenses": (
                f"Monthly expenses of ₹{v:,.0f} are well controlled relative to income."
                if positive
                else f"Monthly expenses of ₹{v:,.0f} are high, reducing your disposable income."
            ),
            "savings": (
                f"Savings of ₹{v:,.0f} provide a healthy financial cushion."
                if positive
                else f"Savings of ₹{v:,.0f} are insufficient as an emergency buffer."
            ),
            "total_debt": (
                f"Total debt of ₹{v:,.0f} is manageable relative to your income."
                if positive
                else f"Total outstanding debt of ₹{v:,.0f} is elevated, increasing credit risk."
            ),
            "credit_utilization": (
                f"Credit utilization at {v:.0%} is within the healthy range (< 30%)."
                if positive
                else f"Credit utilization at {v:.0%} exceeds the recommended 30%, signaling over-reliance on credit."
            ),
            "num_credit_accounts": (
                f"Having {int(v)} credit accounts shows a healthy credit mix."
                if positive
                else f"Having {int(v)} credit accounts {'is too few to build a strong profile' if v < 2 else 'may indicate over-leveraging'}."
            ),
            "num_loans": (
                f"{int(v)} active loan(s) are within manageable limits."
                if positive
                else f"{int(v)} active loans increase your total debt obligation."
            ),
            "payment_history_pct": (
                f"An on-time payment rate of {v:.0%} reflects excellent repayment discipline."
                if positive
                else f"An on-time payment rate of {v:.0%} indicates missed or late payments, which significantly hurts your score."
            ),
            "credit_history_length_months": (
                f"A credit history of {int(v)} months demonstrates long-term credit reliability."
                if positive
                else f"A credit history of only {int(v)} months is too short for lenders to assess your reliability."
            ),
            "recent_inquiries": (
                f"{int(v)} recent inquiry(ies) — your credit-seeking behaviour is measured."
                if positive
                else f"{int(v)} recent inquiries suggest aggressive credit-seeking, which lenders view negatively."
            ),
            "bankruptcies": (
                "No bankruptcies on record — this is favourable."
                if positive
                else f"{int(v)} bankruptcy record(s) severely damage your creditworthiness."
            ),
            "tax_liens": (
                "No tax liens on your profile — a positive signal."
                if positive
                else f"{int(v)} tax lien(s) indicate unresolved government obligations."
            ),
            "debt_to_income_ratio": (
                f"A debt-to-income ratio of {v:.0%} is within comfortable limits."
                if positive
                else f"A debt-to-income ratio of {v:.0%} is high, suggesting over-leverage."
            ),
            "savings_ratio": (
                f"You save {v:.0%} of your income — a healthy savings habit."
                if positive
                else f"A savings ratio of {v:.0%} is below the recommended 20% threshold."
            ),
            "expense_to_income_ratio": (
                f"Expenses consume {v:.0%} of income — well within healthy bounds."
                if positive
                else f"Expenses at {v:.0%} of income leave little room for savings or debt repayment."
            ),
            "age": (
                f"At age {int(v)}, your demographic profile is favourable for credit."
                if positive
                else f"At age {int(v)}, you may have limited credit history or income stability."
            ),
            "employment_length_months": (
                f"{int(v)} months of employment tenure signals job stability."
                if positive
                else f"Employment tenure of {int(v)} months is short, indicating potential income instability."
            ),
            "dependents": (
                f"{int(v)} dependent(s) — your household obligations are manageable."
                if positive
                else f"{int(v)} dependents increase your financial burden."
            ),
            "monthly_disposable_income": (
                f"Monthly disposable income of ₹{v:,.0f} provides a strong repayment buffer."
                if positive
                else f"Monthly disposable income of ₹{v:,.0f} is low, limiting your ability to take on new debt."
            ),
        }

        return descriptions.get(
            feature_name,
            f"{_FEATURE_DISPLAY.get(feature_name, feature_name)} "
            f"({'positively' if positive else 'negatively'}) impacts your credit assessment.",
        )

    # ------------------------------------------------------------------
    # Suggestion generator
    # ------------------------------------------------------------------

    @staticmethod
    def _suggestion_for(
        feature_name: str,
        feature_value: float,
        feature_map: dict[str, float],
    ) -> str | None:
        """Return a contextual improvement tip for a specific feature.

        Args:
            feature_name: Internal feature name.
            feature_value: Current value.
            feature_map: Full feature-value mapping for cross-referencing.

        Returns:
            An actionable suggestion string, or ``None`` if no specific
            advice applies.
        """
        tips: dict[str, str] = {
            "credit_utilization": (
                "Reduce your credit card utilization below 30%. Consider requesting a credit limit increase "
                "or spreading purchases across multiple cards."
            ),
            "payment_history_pct": (
                "Prioritize paying at least the minimum due on all EMIs and credit cards before the due date. "
                "Set up NACH/auto-debit mandates to avoid accidental misses."
            ),
            "total_debt": (
                "Focus on repaying high-interest debt first (credit cards, personal loans). "
                "Consider a balance-transfer or debt consolidation loan at a lower rate."
            ),
            "debt_to_income_ratio": (
                "Work on reducing your debt-to-income ratio below 35%. Avoid taking new loans "
                "and channel any surplus income towards principal prepayments."
            ),
            "savings": (
                "Build an emergency fund of at least 6 months' expenses. Start a recurring deposit "
                "or SIP to automate monthly savings."
            ),
            "savings_ratio": (
                "Aim to save at least 20% of your monthly income. Track expenses using SpendiFy "
                "to identify areas where you can cut back."
            ),
            "recent_inquiries": (
                "Limit credit applications to essential needs only. Multiple hard inquiries within "
                "a short period can lower your CIBIL score by 10-30 points."
            ),
            "credit_history_length_months": (
                "Keep your oldest credit account active — even if unused, its age boosts your score. "
                "Avoid closing old credit cards."
            ),
            "monthly_expenses": (
                "Review your monthly subscriptions and discretionary spending. Even small reductions "
                "in expenses can materially improve your savings ratio."
            ),
            "expense_to_income_ratio": (
                "Your expenses consume a large share of income. Create a budget with SpendiFy "
                "and target reducing discretionary spending by 10-15%."
            ),
            "num_loans": (
                "Having too many active loans increases your fixed obligations. "
                "Prioritize closing smaller loans or consolidating them."
            ),
            "bankruptcies": (
                "A bankruptcy record stays for 7-10 years. Focus on rebuilding credit with a "
                "secured credit card and consistent on-time payments."
            ),
            "tax_liens": (
                "Resolve outstanding tax liens as soon as possible. Contact the tax authority "
                "to set up a payment plan if lump-sum repayment isn't feasible."
            ),
            "monthly_disposable_income": (
                "Increase disposable income by reducing fixed expenses or exploring supplemental "
                "income sources. This improves your EMI affordability."
            ),
            "employment_length_months": (
                "Employment stability matters to lenders. If you recently changed jobs, wait at "
                "least 6 months before applying for new credit."
            ),
            "annual_income": (
                "Explore ways to increase your income — upskilling, certifications, or side projects "
                "can help improve your credit profile over time."
            ),
            "monthly_income": (
                "A higher monthly income improves your EMI-to-income ratio. Consider "
                "renegotiating your salary or diversifying income streams."
            ),
            "num_credit_accounts": (
                "Consider opening a credit card or a small credit line to diversify your credit mix, "
                "but only if you can manage repayments responsibly."
            ),
            "age": None,  # Not actionable
            "dependents": None,  # Not directly actionable
        }
        return tips.get(feature_name)
