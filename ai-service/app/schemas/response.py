"""Response schemas for the SpendiFy AI Service API.

Each model represents the JSON shape returned by a specific endpoint,
providing automatic serialisation and OpenAPI documentation.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Financial summary
# ---------------------------------------------------------------------------

class FinancialSummary(BaseModel):
    """Aggregated financial summary derived from bank-statement data.

    Attributes:
        total_income: Sum of all credit transactions.
        total_expenses: Sum of all debit transactions.
        net_savings: ``total_income - total_expenses``.
        savings_ratio: ``net_savings / total_income`` (0 when income is 0).
        avg_monthly_income: Average monthly credit inflow.
        avg_monthly_expenses: Average monthly debit outflow.
        top_expense_categories: Top spending categories mapped to amounts.
        transaction_count: Total number of transactions analysed.
        period_months: Duration of the analysis period in months.
    """

    total_income: float = Field(
        ...,
        description="Sum of all credit transactions.",
    )
    total_expenses: float = Field(
        ...,
        description="Sum of all debit transactions.",
    )
    net_savings: float = Field(
        ...,
        description="Total income minus total expenses.",
    )
    savings_ratio: float = Field(
        ...,
        description="Savings as a fraction of income.",
    )
    avg_monthly_income: float = Field(
        ...,
        description="Average monthly credit inflow.",
    )
    avg_monthly_expenses: float = Field(
        ...,
        description="Average monthly debit outflow.",
    )
    top_expense_categories: dict[str, float] = Field(
        ...,
        description="Spending categories ranked by total amount.",
    )
    transaction_count: int = Field(
        ...,
        description="Total number of transactions analysed.",
    )
    period_months: int = Field(
        ...,
        description="Duration of the analysis period in months.",
    )


# ---------------------------------------------------------------------------
# SHAP-based feature explanation
# ---------------------------------------------------------------------------

class FeatureExplanation(BaseModel):
    """Human-readable explanation of a single feature's contribution.

    Attributes:
        feature_name: Machine-learning feature identifier.
        feature_value: Raw numeric value of the feature.
        shap_value: SHAP contribution to the prediction.
        impact: Direction of impact – ``positive`` pushes the score up,
            ``negative`` pushes it down.
        description: Plain-language explanation of the feature's effect.
    """

    feature_name: str = Field(
        ...,
        description="Feature identifier.",
    )
    feature_value: float = Field(
        ...,
        description="Raw numeric value of the feature.",
    )
    shap_value: float = Field(
        ...,
        description="SHAP contribution to the prediction.",
    )
    impact: Literal["positive", "negative"] = Field(
        ...,
        description="Direction of impact on the score.",
    )
    description: str = Field(
        ...,
        description="Plain-language explanation.",
    )


# ---------------------------------------------------------------------------
# Credit score
# ---------------------------------------------------------------------------

class CreditScoreResponse(BaseModel):
    """Result of a credit-score prediction.

    Attributes:
        credit_score: Predicted credit score (300–900).
        score_range: Min / max bounds of the scoring scale.
        default_probability: Estimated probability of default.
        approval_probability: Estimated probability of loan approval.
        risk_level: Categorical risk band (e.g. LOW, MEDIUM, HIGH).
        financial_health_score: Composite financial-health indicator (0–100).
        key_factors: SHAP-based feature explanations.
        improvement_suggestions: Actionable tips to improve the score.
    """

    credit_score: int = Field(
        ...,
        description="Predicted credit score.",
    )
    score_range: dict = Field(
        default={"min": 300, "max": 900},
        description="Minimum and maximum of the scoring scale.",
    )
    default_probability: float = Field(
        ...,
        description="Estimated probability of default.",
    )
    approval_probability: float = Field(
        ...,
        description="Estimated probability of loan approval.",
    )
    risk_level: str = Field(
        ...,
        description="Categorical risk band.",
    )
    financial_health_score: float = Field(
        ...,
        description="Composite financial-health indicator (0–100).",
    )
    key_factors: list[FeatureExplanation] = Field(
        ...,
        description="SHAP-based feature explanations.",
    )
    improvement_suggestions: list[str] = Field(
        ...,
        description="Actionable tips to improve the score.",
    )


# ---------------------------------------------------------------------------
# Risk assessment
# ---------------------------------------------------------------------------

class RiskAssessmentResponse(BaseModel):
    """Risk-assessment output with factor analysis.

    Attributes:
        risk_level: Overall categorical risk classification.
        risk_probabilities: Per-class probability distribution.
        risk_factors: Identified risk drivers.
        mitigation_suggestions: Recommendations to reduce risk.
    """

    risk_level: str = Field(
        ...,
        description="Overall risk classification.",
    )
    risk_probabilities: dict[str, float] = Field(
        ...,
        description="Risk-class probability distribution.",
    )
    risk_factors: list[str] = Field(
        ...,
        description="Identified risk-driving factors.",
    )
    mitigation_suggestions: list[str] = Field(
        ...,
        description="Recommendations to reduce risk.",
    )


# ---------------------------------------------------------------------------
# Loan recommendation
# ---------------------------------------------------------------------------

class LoanRecommendationResponse(BaseModel):
    """Personalised loan-product recommendation.

    Attributes:
        eligible: Whether the applicant qualifies for a loan.
        max_loan_amount: Maximum qualifying loan amount.
        recommended_tenure: Suggested repayment tenure in months.
        interest_rate_range: Indicative interest-rate band.
        estimated_emi: Projected monthly instalment for the recommended loan.
        max_affordable_emi: Maximum EMI the applicant can comfortably afford.
        alternatives: Alternative loan structures the applicant may consider.
        warnings: Risk or eligibility warnings for the applicant.
    """

    eligible: bool = Field(
        ...,
        description="Whether the applicant qualifies.",
    )
    max_loan_amount: float = Field(
        ...,
        description="Maximum qualifying loan amount.",
    )
    recommended_tenure: int = Field(
        ...,
        description="Suggested repayment tenure in months.",
    )
    interest_rate_range: dict[str, float] = Field(
        ...,
        description="Indicative interest-rate band (min/max).",
    )
    estimated_emi: float = Field(
        ...,
        description="Projected monthly instalment.",
    )
    max_affordable_emi: float = Field(
        ...,
        description="Maximum affordable EMI.",
    )
    alternatives: list[dict] = Field(
        default_factory=list,
        description="Alternative loan structures.",
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Risk or eligibility warnings.",
    )


# ---------------------------------------------------------------------------
# AI Chat
# ---------------------------------------------------------------------------

class ChatResponse(BaseModel):
    """Response from the conversational financial-advisor endpoint.

    Attributes:
        response: Generated advisor reply text.
        intent: Detected user intent.
        confidence: Confidence score for the detected intent.
        suggestions: Follow-up suggestions or quick-reply options.
    """

    response: str = Field(
        ...,
        description="Generated advisor reply.",
    )
    intent: str = Field(
        ...,
        description="Detected user intent.",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Intent-detection confidence.",
    )
    suggestions: list[str] = Field(
        default_factory=list,
        description="Follow-up suggestions.",
    )


# ---------------------------------------------------------------------------
# Early-warning system
# ---------------------------------------------------------------------------

class AlertItem(BaseModel):
    """A single early-warning alert.

    Attributes:
        metric: Name of the metric that triggered the alert.
        severity: Alert severity level.
        current_value: Current metric value.
        threshold: Threshold that was breached.
        message: Human-readable alert message.
        recommendation: Suggested corrective action.
    """

    metric: str = Field(
        ...,
        description="Metric that triggered the alert.",
    )
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = Field(
        ...,
        description="Alert severity level.",
    )
    current_value: float = Field(
        ...,
        description="Current metric value.",
    )
    threshold: float = Field(
        ...,
        description="Threshold that was breached.",
    )
    message: str = Field(
        ...,
        description="Human-readable alert message.",
    )
    recommendation: str = Field(
        ...,
        description="Suggested corrective action.",
    )


class EarlyWarningResponse(BaseModel):
    """Aggregated early-warning response.

    Attributes:
        overall_risk: Summary risk classification.
        alerts: List of individual alert items.
        risk_score: Numeric composite risk score (0–100).
        summary: Plain-language summary of the overall risk posture.
    """

    overall_risk: str = Field(
        ...,
        description="Summary risk classification.",
    )
    alerts: list[AlertItem] = Field(
        default_factory=list,
        description="Individual alert items.",
    )
    risk_score: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Composite risk score (0–100).",
    )
    summary: str = Field(
        ...,
        description="Plain-language risk summary.",
    )


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    """Service health-check response.

    Attributes:
        status: Service status (``healthy`` / ``degraded`` / ``unhealthy``).
        service: Service name.
        version: Deployed service version.
        models_loaded: Per-model load status.
    """

    status: str = Field(
        ...,
        description="Service status.",
    )
    service: str = Field(
        ...,
        description="Service name.",
    )
    version: str = Field(
        ...,
        description="Deployed service version.",
    )
    models_loaded: dict[str, bool] = Field(
        default_factory=dict,
        description="Per-model load status.",
    )
