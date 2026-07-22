"""
Early Warning System for SpendiFy AI.

Monitors a user's financial metrics against configurable thresholds to
detect deteriorating financial health.  Generates prioritised alerts,
computes a composite risk score, and produces an actionable summary.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


class EarlyWarningSystem:
    """Financial early-warning engine.

    Assesses current (and optionally historical) financial metrics
    against predefined thresholds to identify emerging risks before
    they become critical.
    """

    # ------------------------------------------------------------------
    # Thresholds
    # ------------------------------------------------------------------
    THRESHOLDS: dict[str, dict[str, Any]] = {
        "income_drop": {
            "HIGH": 0.20,   # > 20 % drop → HIGH
            "MEDIUM": 0.10, # > 10 % drop → MEDIUM
            "description": "Income has declined compared to the previous period.",
        },
        "expense_increase": {
            "HIGH": 0.30,   # > 30 % increase → HIGH
            "MEDIUM": 0.15, # > 15 % increase → MEDIUM
            "description": "Expenses have increased compared to the previous period.",
        },
        "savings_rate": {
            "HIGH": 0.05,   # < 5 % savings rate → HIGH
            "MEDIUM": 0.15, # < 15 % savings rate → MEDIUM
            "description": "Savings rate is below a healthy level.",
        },
        "debt_to_income": {
            "HIGH": 0.50,   # > 0.50 → HIGH
            "MEDIUM": 0.35, # > 0.35 → MEDIUM
            "description": "Debt-to-income ratio is elevated.",
        },
        "missed_payments": {
            "HIGH": 1,      # >= 1 missed payment → HIGH
            "description": "One or more payments were missed in the recent period.",
        },
        "negative_cash_flow": {
            "HIGH": True,   # negative cash flow → HIGH
            "description": "Monthly expenses exceed monthly income.",
        },
    }

    # Severity weights for risk score calculation
    _SEVERITY_WEIGHT: dict[str, float] = {
        "HIGH": 1.0,
        "MEDIUM": 0.5,
        "LOW": 0.2,
    }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def assess(
        self,
        current_metrics: dict[str, Any],
        historical_metrics: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Run the full early-warning assessment.

        Args:
            current_metrics: Current-period financial metrics.
                Expected keys: ``monthly_income``, ``monthly_expenses``,
                ``savings``, ``total_debt``, ``annual_income``,
                ``missed_payments``, ``credit_utilization``.
            historical_metrics: Optional previous-period metrics used
                for trend detection (income drop, expense increase).

        Returns:
            A dict compatible with ``EarlyWarningResponse``:
            - ``alerts`` (list[dict]): AlertItem-compatible dicts.
            - ``risk_score`` (float): 0-100 composite score.
            - ``overall_risk`` (str): HIGH / MEDIUM / LOW.
            - ``summary`` (str): Human-readable assessment.
            - ``assessed_at`` (str): ISO-8601 timestamp.
        """
        logger.info("Running early-warning assessment.")

        alerts: list[dict[str, Any]] = []
        hist = historical_metrics or {}

        # --- 1. Income drop -----------------------------------------------
        self._check_income_drop(current_metrics, hist, alerts)

        # --- 2. Expense increase ------------------------------------------
        self._check_expense_increase(current_metrics, hist, alerts)

        # --- 3. Savings rate ----------------------------------------------
        self._check_savings_rate(current_metrics, alerts)

        # --- 4. Debt-to-income --------------------------------------------
        self._check_debt_to_income(current_metrics, alerts)

        # --- 5. Missed payments -------------------------------------------
        self._check_missed_payments(current_metrics, alerts)

        # --- 6. Negative cash flow ----------------------------------------
        self._check_negative_cash_flow(current_metrics, alerts)

        # --- Compute composite risk score ---------------------------------
        risk_score = self._calculate_risk_score(alerts)
        overall_risk = self._determine_overall_risk(risk_score, alerts)
        summary = self._generate_summary(alerts, risk_score, overall_risk)

        response: dict[str, Any] = {
            "alerts": alerts,
            "risk_score": round(risk_score, 2),
            "overall_risk": overall_risk,
            "summary": summary,
            "assessed_at": datetime.now(timezone.utc).isoformat(),
        }

        logger.info(
            "Assessment complete — %d alert(s), risk_score=%.1f, overall=%s",
            len(alerts),
            risk_score,
            overall_risk,
        )
        return response

    # ------------------------------------------------------------------
    # Individual metric checks
    # ------------------------------------------------------------------

    def _check_income_drop(
        self,
        current: dict[str, Any],
        historical: dict[str, Any],
        alerts: list[dict[str, Any]],
    ) -> None:
        """Detect income decline between periods."""
        prev_income = historical.get("monthly_income", 0)
        curr_income = current.get("monthly_income", 0)

        if prev_income <= 0:
            return

        drop_pct = (prev_income - curr_income) / prev_income

        if drop_pct > self.THRESHOLDS["income_drop"]["HIGH"]:
            alerts.append(
                self._build_alert(
                    metric="income_drop",
                    severity="HIGH",
                    value=round(drop_pct, 4),
                    message=(
                        f"Your income has dropped by {drop_pct:.0%} compared to the "
                        f"previous period (₹{prev_income:,.0f} → ₹{curr_income:,.0f})."
                    ),
                    recommendation=(
                        "Review your income sources urgently. Cut discretionary spending "
                        "and pause non-essential investments until income stabilises."
                    ),
                )
            )
        elif drop_pct > self.THRESHOLDS["income_drop"]["MEDIUM"]:
            alerts.append(
                self._build_alert(
                    metric="income_drop",
                    severity="MEDIUM",
                    value=round(drop_pct, 4),
                    message=(
                        f"Your income has declined by {drop_pct:.0%} "
                        f"(₹{prev_income:,.0f} → ₹{curr_income:,.0f})."
                    ),
                    recommendation=(
                        "Monitor your income trend over the next 1-2 months. "
                        "Consider building a larger emergency buffer."
                    ),
                )
            )

    def _check_expense_increase(
        self,
        current: dict[str, Any],
        historical: dict[str, Any],
        alerts: list[dict[str, Any]],
    ) -> None:
        """Detect unusual expense growth."""
        prev_expense = historical.get("monthly_expenses", 0)
        curr_expense = current.get("monthly_expenses", 0)

        if prev_expense <= 0:
            return

        increase_pct = (curr_expense - prev_expense) / prev_expense

        if increase_pct > self.THRESHOLDS["expense_increase"]["HIGH"]:
            alerts.append(
                self._build_alert(
                    metric="expense_increase",
                    severity="HIGH",
                    value=round(increase_pct, 4),
                    message=(
                        f"Monthly expenses have surged by {increase_pct:.0%} "
                        f"(₹{prev_expense:,.0f} → ₹{curr_expense:,.0f})."
                    ),
                    recommendation=(
                        "Investigate the spike in spending immediately. Categorise "
                        "expenses in SpendiFy to identify the largest increases."
                    ),
                )
            )
        elif increase_pct > self.THRESHOLDS["expense_increase"]["MEDIUM"]:
            alerts.append(
                self._build_alert(
                    metric="expense_increase",
                    severity="MEDIUM",
                    value=round(increase_pct, 4),
                    message=(
                        f"Monthly expenses increased by {increase_pct:.0%} "
                        f"(₹{prev_expense:,.0f} → ₹{curr_expense:,.0f})."
                    ),
                    recommendation=(
                        "Review recent spending categories for unusual charges. "
                        "Set spending alerts in SpendiFy to catch future increases early."
                    ),
                )
            )

    def _check_savings_rate(
        self,
        current: dict[str, Any],
        alerts: list[dict[str, Any]],
    ) -> None:
        """Check if savings rate is below healthy thresholds."""
        monthly_income = current.get("monthly_income", 0)
        monthly_expenses = current.get("monthly_expenses", 0)

        if monthly_income <= 0:
            return

        savings_rate = (monthly_income - monthly_expenses) / monthly_income

        if savings_rate < self.THRESHOLDS["savings_rate"]["HIGH"]:
            alerts.append(
                self._build_alert(
                    metric="savings_rate",
                    severity="HIGH",
                    value=round(savings_rate, 4),
                    message=(
                        f"Your savings rate is critically low at {savings_rate:.0%}. "
                        "You are saving almost nothing from your monthly income."
                    ),
                    recommendation=(
                        "This is unsustainable. Identify and eliminate non-essential "
                        "expenses immediately. Aim for a minimum 10% savings rate."
                    ),
                )
            )
        elif savings_rate < self.THRESHOLDS["savings_rate"]["MEDIUM"]:
            alerts.append(
                self._build_alert(
                    metric="savings_rate",
                    severity="MEDIUM",
                    value=round(savings_rate, 4),
                    message=(
                        f"Your savings rate is {savings_rate:.0%}, below the "
                        "recommended 20% threshold."
                    ),
                    recommendation=(
                        "Increase your savings rate by cutting discretionary spending. "
                        "Automate savings with a monthly SIP or recurring deposit."
                    ),
                )
            )

    def _check_debt_to_income(
        self,
        current: dict[str, Any],
        alerts: list[dict[str, Any]],
    ) -> None:
        """Check debt-to-income ratio."""
        total_debt = current.get("total_debt", 0)
        annual_income = current.get("annual_income", 0)

        if annual_income <= 0:
            return

        dti = total_debt / annual_income

        if dti > self.THRESHOLDS["debt_to_income"]["HIGH"]:
            alerts.append(
                self._build_alert(
                    metric="debt_to_income",
                    severity="HIGH",
                    value=round(dti, 4),
                    message=(
                        f"Your debt-to-income ratio is {dti:.0%}, well above the "
                        "safe limit of 35%. You are heavily leveraged."
                    ),
                    recommendation=(
                        "Prioritise aggressive debt repayment. Avoid taking any new "
                        "loans. Consider debt consolidation at a lower interest rate."
                    ),
                )
            )
        elif dti > self.THRESHOLDS["debt_to_income"]["MEDIUM"]:
            alerts.append(
                self._build_alert(
                    metric="debt_to_income",
                    severity="MEDIUM",
                    value=round(dti, 4),
                    message=(
                        f"Your debt-to-income ratio is {dti:.0%}, approaching the "
                        "risky zone above 50%."
                    ),
                    recommendation=(
                        "Avoid new debt and focus on repaying high-interest loans. "
                        "Channel any surplus income towards principal prepayment."
                    ),
                )
            )

    def _check_missed_payments(
        self,
        current: dict[str, Any],
        alerts: list[dict[str, Any]],
    ) -> None:
        """Check for any missed payments."""
        missed = current.get("missed_payments", 0)

        if missed >= self.THRESHOLDS["missed_payments"]["HIGH"]:
            alerts.append(
                self._build_alert(
                    metric="missed_payments",
                    severity="HIGH",
                    value=missed,
                    message=(
                        f"You have {missed} missed payment(s) in the recent period. "
                        "Each missed payment can reduce your CIBIL score by 50-100 points."
                    ),
                    recommendation=(
                        "Clear overdue payments immediately. Set up auto-debit mandates "
                        "(NACH) for all EMIs and credit card bills to prevent recurrence."
                    ),
                )
            )

    def _check_negative_cash_flow(
        self,
        current: dict[str, Any],
        alerts: list[dict[str, Any]],
    ) -> None:
        """Check if expenses exceed income (negative cash flow)."""
        monthly_income = current.get("monthly_income", 0)
        monthly_expenses = current.get("monthly_expenses", 0)

        if monthly_income > 0 and monthly_expenses > monthly_income:
            shortfall = monthly_expenses - monthly_income
            alerts.append(
                self._build_alert(
                    metric="negative_cash_flow",
                    severity="HIGH",
                    value=round(-shortfall, 2),
                    message=(
                        f"You are spending ₹{shortfall:,.0f} more than you earn each "
                        "month. This is unsustainable and will deplete your savings."
                    ),
                    recommendation=(
                        "This requires immediate attention. Drastically cut expenses "
                        "or find additional income sources. Review all subscriptions, "
                        "EMIs, and discretionary spending."
                    ),
                )
            )

    # ------------------------------------------------------------------
    # Risk score & overall risk
    # ------------------------------------------------------------------

    def _calculate_risk_score(
        self, alerts: list[dict[str, Any]]
    ) -> float:
        """Calculate a composite risk score from 0 (safe) to 100 (critical).

        Each alert contributes weighted points based on its severity.
        The score is normalised so that 6 simultaneous HIGH alerts
        yield a score of 100.

        Args:
            alerts: List of AlertItem-compatible dicts.

        Returns:
            A float in [0, 100].
        """
        if not alerts:
            return 0.0

        max_possible = len(self.THRESHOLDS) * self._SEVERITY_WEIGHT["HIGH"]
        total_weight = sum(
            self._SEVERITY_WEIGHT.get(a.get("severity", "LOW"), 0.2)
            for a in alerts
        )
        raw_score = (total_weight / max_possible) * 100
        return min(max(raw_score, 0.0), 100.0)

    @staticmethod
    def _determine_overall_risk(
        risk_score: float, alerts: list[dict[str, Any]]
    ) -> str:
        """Map risk score and alert severities to an overall risk label.

        Args:
            risk_score: Composite score in [0, 100].
            alerts: List of alerts.

        Returns:
            ``"HIGH"``, ``"MEDIUM"``, or ``"LOW"``.
        """
        has_high = any(a.get("severity") == "HIGH" for a in alerts)

        if risk_score >= 60 or has_high:
            return "HIGH"
        if risk_score >= 30:
            return "MEDIUM"
        return "LOW"

    # ------------------------------------------------------------------
    # Summary generation
    # ------------------------------------------------------------------

    @staticmethod
    def _generate_summary(
        alerts: list[dict[str, Any]],
        risk_score: float,
        overall_risk: str,
    ) -> str:
        """Generate a human-readable assessment summary.

        Args:
            alerts: All generated alerts.
            risk_score: Composite risk score.
            overall_risk: HIGH / MEDIUM / LOW.

        Returns:
            A concise summary paragraph.
        """
        if not alerts:
            return (
                "No financial warning signs detected. Your metrics are within "
                "healthy ranges. Continue monitoring regularly with SpendiFy."
            )

        high_count = sum(1 for a in alerts if a.get("severity") == "HIGH")
        medium_count = sum(1 for a in alerts if a.get("severity") == "MEDIUM")

        parts: list[str] = []

        if overall_risk == "HIGH":
            parts.append(
                f"⚠️ Your financial health requires immediate attention "
                f"(risk score: {risk_score:.0f}/100)."
            )
        elif overall_risk == "MEDIUM":
            parts.append(
                f"Your financial health shows some warning signs "
                f"(risk score: {risk_score:.0f}/100)."
            )
        else:
            parts.append(
                f"Minor areas for improvement were identified "
                f"(risk score: {risk_score:.0f}/100)."
            )

        alert_breakdown: list[str] = []
        if high_count:
            alert_breakdown.append(f"{high_count} critical")
        if medium_count:
            alert_breakdown.append(f"{medium_count} moderate")
        low_count = len(alerts) - high_count - medium_count
        if low_count:
            alert_breakdown.append(f"{low_count} minor")

        parts.append(
            f"We detected {len(alerts)} alert(s): "
            + ", ".join(alert_breakdown)
            + "."
        )

        # Highlight top recommendation
        high_alerts = [a for a in alerts if a.get("severity") == "HIGH"]
        if high_alerts:
            parts.append(
                f"Top priority: {high_alerts[0].get('recommendation', 'Review critical alerts.')}"
            )

        return " ".join(parts)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _build_alert(
        metric: str,
        severity: str,
        value: Any,
        message: str,
        recommendation: str,
    ) -> dict[str, Any]:
        """Build an AlertItem-compatible dict.

        Args:
            metric: Internal metric name (e.g. ``income_drop``).
            severity: ``HIGH``, ``MEDIUM``, or ``LOW``.
            value: The measured metric value.
            message: Human-readable alert message.
            recommendation: Actionable advice.

        Returns:
            A dict with keys ``metric``, ``severity``, ``value``,
            ``message``, ``recommendation``, ``timestamp``.
        """
        return {
            "metric": metric,
            "severity": severity,
            "value": value,
            "message": message,
            "recommendation": recommendation,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
