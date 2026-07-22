"""
SpendiFy AI Service - Loan Recommender Module.

Generates personalised loan recommendations based on credit score, income,
expenses, and existing debt. The engine **never** outright rejects an applicant;
instead it always provides alternatives (lower amount, longer tenure, or both).
"""

import logging
import math
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Interest-rate brackets keyed by credit-score band
_INTEREST_BRACKETS: List[Dict[str, Any]] = [
    {"min_score": 750, "max_score": 900, "min_rate": 10.0, "max_rate": 12.0, "label": "Excellent"},
    {"min_score": 650, "max_score": 749, "min_rate": 14.0, "max_rate": 16.0, "label": "Good"},
    {"min_score": 550, "max_score": 649, "min_rate": 18.0, "max_rate": 22.0, "label": "Fair"},
    {"min_score": 300, "max_score": 549, "min_rate": 24.0, "max_rate": 30.0, "label": "Poor"},
]

# Maximum share of disposable income that can go towards EMIs
_MAX_EMI_RATIO: float = 0.40

# Tenure options offered as alternatives (in months)
_STANDARD_TENURES: tuple[int, ...] = (12, 24, 36, 48, 60)


class LoanRecommender:
    """Context-aware loan recommendation engine.

    Given a borrower profile (credit score, income, expenses, existing debt)
    this class computes the maximum affordable loan and generates
    recommendations. When the requested amount exceeds affordability the
    engine returns alternatives rather than a flat rejection.

    Example::

        recommender = LoanRecommender()
        result = recommender.recommend(
            credit_score=720,
            monthly_income=80_000,
            monthly_expenses=35_000,
            existing_debt=5_000,
            requested_amount=500_000,
            requested_tenure=36,
        )
    """

    # ------------------------------------------------------------------
    # Static / internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _get_interest_bracket(credit_score: int) -> Dict[str, Any]:
        """Return the interest-rate bracket for a given credit score.

        Args:
            credit_score: Integer credit score (typically 300-900).

        Returns:
            Dictionary with ``min_score``, ``max_score``, ``min_rate``,
            ``max_rate``, and ``label`` for the matching bracket.
        """
        for bracket in _INTEREST_BRACKETS:
            if bracket["min_score"] <= credit_score <= bracket["max_score"]:
                return dict(bracket)

        # If the score falls outside all defined brackets, default to the
        # worst bracket to ensure we always return *something*.
        return dict(_INTEREST_BRACKETS[-1])

    @staticmethod
    def _calculate_emi(
        principal: float,
        annual_rate: float,
        tenure_months: int,
    ) -> float:
        """Calculate the Equated Monthly Instalment (EMI).

        Uses the standard reducing-balance EMI formula::

            EMI = P × r × (1 + r)^n / ((1 + r)^n − 1)

        where *P* is the principal, *r* the monthly interest rate, and
        *n* the tenure in months.

        Args:
            principal: Loan principal amount.
            annual_rate: Annual interest rate as a **percentage** (e.g. 12.0).
            tenure_months: Repayment period in months.

        Returns:
            Monthly EMI amount. Returns 0.0 when inputs are non-positive.
        """
        if principal <= 0 or annual_rate <= 0 or tenure_months <= 0:
            return 0.0

        monthly_rate: float = annual_rate / (12.0 * 100.0)
        compound: float = math.pow(1.0 + monthly_rate, tenure_months)
        emi: float = principal * monthly_rate * compound / (compound - 1.0)
        return round(emi, 2)

    @staticmethod
    def _calculate_max_loan(
        affordable_emi: float,
        annual_rate: float,
        tenure_months: int,
    ) -> float:
        """Reverse-engineer the maximum loan from an affordable EMI.

        Rearranges the EMI formula to solve for principal::

            P = EMI × ((1 + r)^n − 1) / (r × (1 + r)^n)

        Args:
            affordable_emi: The maximum monthly EMI the borrower can afford.
            annual_rate: Annual interest rate as a **percentage**.
            tenure_months: Repayment period in months.

        Returns:
            Maximum loan principal. Returns 0.0 for non-positive inputs.
        """
        if affordable_emi <= 0 or annual_rate <= 0 or tenure_months <= 0:
            return 0.0

        monthly_rate: float = annual_rate / (12.0 * 100.0)
        compound: float = math.pow(1.0 + monthly_rate, tenure_months)
        max_loan: float = affordable_emi * (compound - 1.0) / (monthly_rate * compound)
        return round(max_loan, 2)

    # ------------------------------------------------------------------
    # Private recommendation logic
    # ------------------------------------------------------------------

    def _build_alternatives(
        self,
        affordable_emi: float,
        annual_rate: float,
        requested_amount: Optional[float],
        requested_tenure: Optional[int],
    ) -> List[Dict[str, Any]]:
        """Generate alternative loan options across standard tenures.

        Each alternative contains the maximum affordable amount for that
        tenure and the corresponding EMI.

        Args:
            affordable_emi: Maximum monthly EMI the borrower can afford.
            annual_rate: Annual interest rate as a percentage.
            requested_amount: The amount the borrower originally asked for.
            requested_tenure: The tenure the borrower originally asked for.

        Returns:
            List of alternative recommendation dictionaries.
        """
        alternatives: List[Dict[str, Any]] = []

        for tenure in _STANDARD_TENURES:
            max_loan = self._calculate_max_loan(affordable_emi, annual_rate, tenure)
            if max_loan <= 0:
                continue

            # If the requested amount fits within this tenure, show it
            if requested_amount is not None and requested_amount <= max_loan:
                emi = self._calculate_emi(requested_amount, annual_rate, tenure)
                alternatives.append(
                    {
                        "amount": round(requested_amount, 2),
                        "tenure_months": tenure,
                        "emi": emi,
                        "annual_rate": annual_rate,
                        "is_within_budget": True,
                    }
                )
            else:
                emi = self._calculate_emi(max_loan, annual_rate, tenure)
                alternatives.append(
                    {
                        "amount": round(max_loan, 2),
                        "tenure_months": tenure,
                        "emi": emi,
                        "annual_rate": annual_rate,
                        "is_within_budget": True,
                    }
                )

        return alternatives

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def recommend(
        self,
        credit_score: int,
        monthly_income: float,
        monthly_expenses: float,
        existing_debt: float = 0.0,
        requested_amount: Optional[float] = None,
        requested_tenure: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Generate a full loan recommendation with alternatives.

        **Design principle**: NEVER just reject – always provide alternatives.

        The maximum affordable EMI is computed as::

            affordable_emi = 0.40 × (monthly_income − monthly_expenses − existing_debt)

        If the borrower's disposable income is non-positive the engine still
        returns a result with a zero-amount recommendation and guidance.

        Args:
            credit_score: Borrower's credit score (300-900).
            monthly_income: Gross monthly income.
            monthly_expenses: Total monthly expenses.
            existing_debt: Existing monthly debt obligations (default 0).
            requested_amount: Desired loan amount (optional).
            requested_tenure: Desired repayment tenure in months (optional).

        Returns:
            Comprehensive recommendation dictionary containing:
                - ``eligible``: Whether the primary request can be approved.
                - ``credit_score``: Echo of the input score.
                - ``interest_bracket``: Applicable rate bracket details.
                - ``disposable_income``: Monthly disposable income.
                - ``max_affordable_emi``: Maximum EMI the borrower can handle.
                - ``primary_recommendation``: Best-fit loan option.
                - ``alternatives``: List of alternative options.
                - ``rejection_reasons``: List of reasons if primary is declined.
                - ``guidance``: Human-readable advice.
        """
        # --- Disposable income & affordable EMI ---
        disposable_income: float = monthly_income - monthly_expenses - existing_debt
        affordable_emi: float = max(0.0, _MAX_EMI_RATIO * disposable_income)

        # --- Interest bracket ---
        bracket = self._get_interest_bracket(credit_score)
        # Use the midpoint of the bracket as the offered rate
        offered_rate: float = (bracket["min_rate"] + bracket["max_rate"]) / 2.0

        # --- Default tenure ---
        tenure: int = requested_tenure if requested_tenure and requested_tenure > 0 else 36

        # --- Maximum affordable loan ---
        max_loan: float = self._calculate_max_loan(affordable_emi, offered_rate, tenure)

        # --- Primary recommendation ---
        rejection_reasons: List[str] = []
        eligible: bool = True

        if disposable_income <= 0:
            eligible = False
            rejection_reasons.append(
                "Monthly expenses and existing debt exceed income. "
                "Consider reducing expenses or clearing existing obligations."
            )

        if requested_amount is not None and requested_amount > max_loan:
            eligible = False
            rejection_reasons.append(
                f"Requested amount ₹{requested_amount:,.2f} exceeds maximum "
                f"affordable loan of ₹{max_loan:,.2f} at the offered rate of "
                f"{offered_rate:.1f}% p.a. for {tenure} months."
            )

        # Build primary recommendation
        if eligible and requested_amount is not None:
            primary_amount = requested_amount
        else:
            primary_amount = max_loan

        primary_emi: float = self._calculate_emi(primary_amount, offered_rate, tenure)

        primary_recommendation: Dict[str, Any] = {
            "amount": round(primary_amount, 2),
            "tenure_months": tenure,
            "annual_rate": offered_rate,
            "emi": primary_emi,
            "total_payable": round(primary_emi * tenure, 2),
            "total_interest": round(primary_emi * tenure - primary_amount, 2),
            "is_approved": eligible,
        }

        # --- Alternatives (always provided) ---
        alternatives = self._build_alternatives(
            affordable_emi, offered_rate, requested_amount, requested_tenure
        )
        # Remove the alternative that exactly matches the primary
        alternatives = [
            alt
            for alt in alternatives
            if not (
                alt["tenure_months"] == tenure
                and abs(alt["amount"] - primary_amount) < 1.0
            )
        ]

        # --- Guidance ---
        guidance_parts: List[str] = []
        if not eligible:
            guidance_parts.append(
                "Your requested loan could not be fully approved, but we have "
                "alternatives that fit your budget. Review the options below."
            )
        if credit_score < 650:
            guidance_parts.append(
                "Improving your credit score above 650 could significantly "
                "reduce your interest rate and increase your borrowing capacity."
            )
        if disposable_income > 0 and (existing_debt / monthly_income) > 0.30:
            guidance_parts.append(
                "Your debt-to-income ratio is elevated. Paying down existing "
                "debt will improve both your credit profile and affordable EMI."
            )
        if not guidance_parts:
            guidance_parts.append(
                "You have a healthy financial profile. The recommended loan "
                "fits comfortably within your budget."
            )

        return {
            "eligible": eligible,
            "credit_score": credit_score,
            "interest_bracket": bracket,
            "disposable_income": round(disposable_income, 2),
            "max_affordable_emi": round(affordable_emi, 2),
            "max_affordable_loan": round(max_loan, 2),
            "primary_recommendation": primary_recommendation,
            "alternatives": alternatives,
            "rejection_reasons": rejection_reasons,
            "guidance": " ".join(guidance_parts),
        }
