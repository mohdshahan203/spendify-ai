"""Request schemas for the SpendiFy AI Service API.

All models use Pydantic v2 with strict field validators to guarantee
that incoming payloads are well-formed before reaching service logic.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Bank-statement related models
# ---------------------------------------------------------------------------

class TransactionItem(BaseModel):
    """A single financial transaction extracted from a bank statement.

    Attributes:
        date: Transaction date as an ISO-8601 string (``YYYY-MM-DD``).
        description: Raw transaction narration / memo.
        amount: Absolute monetary value of the transaction.
        type: Whether the transaction is a *credit* (inflow) or
            *debit* (outflow).
        category: Optional spending category.  When ``None`` the
            service will attempt automatic categorisation.
    """

    date: str = Field(
        ...,
        min_length=1,
        description="Transaction date in YYYY-MM-DD format.",
    )
    description: str = Field(
        ...,
        min_length=1,
        description="Transaction narration or memo text.",
    )
    amount: float = Field(
        ...,
        gt=0,
        description="Positive monetary value of the transaction.",
    )
    type: Literal["credit", "debit"] = Field(
        ...,
        description="Transaction direction – 'credit' for inflow, 'debit' for outflow.",
    )
    category: str | None = Field(
        default=None,
        description="Spending category.  Auto-detected when omitted.",
    )


class BankStatementData(BaseModel):
    """Parsed bank-statement payload containing a list of transactions.

    Attributes:
        transactions: Ordered list of :class:`TransactionItem` objects.
        period_months: Number of months the statement covers.
        account_holder_name: Optional name of the account holder.
    """

    transactions: list[TransactionItem] = Field(
        ...,
        min_length=1,
        description="List of transactions (must contain at least one).",
    )
    period_months: int = Field(
        default=6,
        ge=1,
        description="Number of months the statement spans.",
    )
    account_holder_name: str | None = Field(
        default=None,
        description="Name of the account holder, if available.",
    )


# ---------------------------------------------------------------------------
# Credit analysis
# ---------------------------------------------------------------------------

class CreditAnalysisRequest(BaseModel):
    """Input features required for credit-score prediction and risk analysis.

    Attributes:
        monthly_income: Gross monthly income (must be > 0).
        monthly_expenses: Total monthly outgoings.
        total_debt: Outstanding debt balance.
        monthly_emi: Sum of all active EMI payments per month.
        savings_balance: Current savings / fixed-deposit balance.
        credit_utilization: Ratio of used credit to available credit (0–1).
        num_active_loans: Count of active loan accounts.
        num_credit_cards: Count of active credit cards.
        payment_history_score: Fraction of on-time payments (0–1, 1 = perfect).
        years_of_credit_history: Length of credit history in years.
        num_hard_inquiries: Hard credit inquiries in the last 12 months.
        employment_type: Employment classification.
        age: Applicant age in years.
        bank_statement: Optional parsed bank-statement data for deeper analysis.
    """

    monthly_income: float = Field(
        ...,
        gt=0,
        description="Gross monthly income in INR.  Must be positive.",
    )
    monthly_expenses: float = Field(
        ...,
        ge=0,
        description="Total monthly expenses in INR.",
    )
    total_debt: float = Field(
        default=0.0,
        ge=0,
        description="Total outstanding debt in INR.",
    )
    monthly_emi: float = Field(
        default=0.0,
        ge=0,
        description="Sum of all active EMI payments per month.",
    )
    savings_balance: float = Field(
        default=0.0,
        ge=0,
        description="Current savings / FD balance in INR.",
    )
    credit_utilization: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Credit-utilization ratio (0–1).",
    )
    num_active_loans: int = Field(
        default=0,
        ge=0,
        description="Number of currently active loan accounts.",
    )
    num_credit_cards: int = Field(
        default=0,
        ge=0,
        description="Number of active credit cards.",
    )
    payment_history_score: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Fraction of on-time payments (0–1).  1.0 = perfect history.",
    )
    years_of_credit_history: float = Field(
        default=0.0,
        ge=0.0,
        description="Length of credit history in years.",
    )
    num_hard_inquiries: int = Field(
        default=0,
        ge=0,
        description="Hard inquiries in the last 12 months.",
    )
    employment_type: Literal[
        "salaried", "self_employed", "business", "freelancer"
    ] = Field(
        default="salaried",
        description="Employment classification of the applicant.",
    )
    age: int = Field(
        default=30,
        ge=18,
        description="Applicant age in years (minimum 18).",
    )
    bank_statement: BankStatementData | None = Field(
        default=None,
        description="Optional bank-statement data for deeper analysis.",
    )

    # -- Validators -----------------------------------------------------------

    @field_validator("monthly_income")
    @classmethod
    def _income_must_be_positive(cls, value: float) -> float:
        """Ensure monthly income is strictly positive."""
        if value <= 0:
            raise ValueError("monthly_income must be greater than 0.")
        return value

    @field_validator("credit_utilization")
    @classmethod
    def _credit_utilization_range(cls, value: float) -> float:
        """Clamp credit utilization to [0, 1]."""
        if not 0.0 <= value <= 1.0:
            raise ValueError(
                "credit_utilization must be between 0.0 and 1.0 (inclusive)."
            )
        return value


# ---------------------------------------------------------------------------
# Loan recommendation
# ---------------------------------------------------------------------------

class LoanRecommendationRequest(BaseModel):
    """Inputs for personalised loan-product recommendations.

    Attributes:
        credit_score: Applicant credit score (300–900).
        monthly_income: Gross monthly income.
        monthly_expenses: Monthly expenses.
        existing_debt: Outstanding debt balance.
        requested_amount: Desired loan amount (optional).
        requested_tenure: Desired tenure in months (optional).
    """

    credit_score: int = Field(
        ...,
        ge=300,
        le=900,
        description="Applicant credit score (300–900).",
    )
    monthly_income: float = Field(
        ...,
        gt=0,
        description="Gross monthly income in INR.",
    )
    monthly_expenses: float = Field(
        ...,
        ge=0,
        description="Monthly expenses in INR.",
    )
    existing_debt: float = Field(
        default=0.0,
        ge=0,
        description="Outstanding debt in INR.",
    )
    requested_amount: float | None = Field(
        default=None,
        description="Desired loan amount in INR (optional).",
    )
    requested_tenure: int | None = Field(
        default=None,
        description="Desired tenure in months (optional).",
    )


# ---------------------------------------------------------------------------
# AI Chat
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    """Payload for the conversational AI financial-advisor endpoint.

    Attributes:
        message: User message text.
        financial_context: Optional dict of the user's current financial
            snapshot (balances, scores, etc.) to ground the response.
        conversation_history: Optional list of prior exchanges for
            multi-turn context.
    """

    message: str = Field(
        ...,
        min_length=1,
        description="User message to the financial advisor.",
    )
    financial_context: dict | None = Field(
        default=None,
        description="Optional financial snapshot to contextualise the response.",
    )
    conversation_history: list[dict] | None = Field(
        default=None,
        description="Prior conversation turns for multi-turn context.",
    )


# ---------------------------------------------------------------------------
# Early warning
# ---------------------------------------------------------------------------

class EarlyWarningRequest(BaseModel):
    """Metrics payload for the early-warning / alert system.

    Attributes:
        current_metrics: Latest financial metrics keyed by metric name.
        historical_metrics: Previous-period metrics for trend comparison.
    """

    current_metrics: dict = Field(
        ...,
        description="Current-period financial metrics.",
    )
    historical_metrics: dict | None = Field(
        default=None,
        description="Previous-period metrics for trend detection.",
    )
