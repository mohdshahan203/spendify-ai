"""
Financial Advisor Chatbot for SpendiFy AI.

A rule-based conversational assistant that detects user intents related
to credit and personal finance, then routes to specialised handlers.
All responses use Indian financial context (CIBIL, EMI, SIP, etc.).
"""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


class FinancialAdvisor:
    """Intent-driven financial advisor chatbot.

    Detects one of seven predefined intents from a user message and
    delegates to a corresponding handler that constructs a contextual
    response using the applicant's financial data.
    """

    # ------------------------------------------------------------------
    # Intent → keyword mapping
    # ------------------------------------------------------------------
    INTENT_KEYWORDS: dict[str, list[str]] = {
        "loan_rejection_reason": [
            "why rejected",
            "loan rejected",
            "application denied",
            "rejection reason",
            "not approved",
            "loan denial",
            "why was my loan",
            "why did my loan",
            "turned down",
            "disapproved",
            "reject",
        ],
        "low_score_reason": [
            "why is my score low",
            "low score",
            "bad score",
            "poor score",
            "low cibil",
            "bad cibil",
            "score low",
            "score bad",
            "credit score low",
            "score dropped",
            "score decreased",
            "why my score",
        ],
        "improve_score": [
            "improve score",
            "increase score",
            "boost score",
            "raise score",
            "better score",
            "improve cibil",
            "increase cibil",
            "boost cibil",
            "fix score",
            "build credit",
            "improve credit",
            "how to improve",
            "tips to improve",
        ],
        "suitable_loan": [
            "which loan",
            "best loan",
            "loan suitable",
            "recommend loan",
            "eligible loan",
            "loan options",
            "what loan",
            "loan type",
            "can i get a loan",
            "loan for me",
            "suggest loan",
            "loan recommendation",
        ],
        "affordable_emi": [
            "emi",
            "monthly installment",
            "affordable emi",
            "how much emi",
            "emi afford",
            "emi capacity",
            "emi calculator",
            "pay per month",
            "monthly payment",
            "installment",
            "repayment capacity",
        ],
        "reduce_risk": [
            "reduce risk",
            "lower risk",
            "decrease risk",
            "risk reduction",
            "less risky",
            "minimize risk",
            "risk management",
            "reduce default",
            "avoid default",
            "financial risk",
            "de-risk",
        ],
        "general_advice": [
            "financial advice",
            "money tips",
            "financial tips",
            "save money",
            "budget",
            "invest",
            "sip",
            "mutual fund",
            "financial plan",
            "money management",
            "wealth",
            "retirement",
            "emergency fund",
            "financial health",
            "help",
            "advice",
            "suggest",
        ],
    }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def detect_intent(self, message: str) -> tuple[str, float]:
        """Detect the most likely intent from a user message.

        Performs case-insensitive keyword matching. The intent with
        the highest number of keyword hits wins; ties are broken by
        the order in ``INTENT_KEYWORDS``.

        Args:
            message: Raw user message string.

        Returns:
            A tuple of ``(intent, confidence)`` where *intent* is one
            of the seven keys in ``INTENT_KEYWORDS`` or ``"general_advice"``
            as a fallback, and *confidence* is a float in ``[0, 1]``.
        """
        msg_lower = message.lower().strip()
        scores: dict[str, int] = {}

        for intent, keywords in self.INTENT_KEYWORDS.items():
            score = 0
            for keyword in keywords:
                if keyword in msg_lower:
                    score += 1
            if score > 0:
                scores[intent] = score

        if not scores:
            return "general_advice", 0.3

        best_intent = max(scores, key=lambda k: scores[k])
        max_possible = len(self.INTENT_KEYWORDS[best_intent])
        confidence = min(scores[best_intent] / max(max_possible * 0.3, 1), 1.0)
        return best_intent, round(confidence, 2)

    def chat(
        self, message: str, financial_context: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Process a user message and generate a financial advisory response.

        Args:
            message: The user's chat message.
            financial_context: Optional dict with the user's financial
                data (credit_score, annual_income, total_debt, etc.).

        Returns:
            A dict with keys ``response``, ``intent``, ``confidence``,
            and ``suggestions``.
        """
        ctx = financial_context or {}
        intent, confidence = self.detect_intent(message)

        handler_map: dict[str, Any] = {
            "loan_rejection_reason": self._handle_loan_rejection,
            "low_score_reason": self._handle_low_score,
            "improve_score": self._handle_improve_score,
            "suitable_loan": self._handle_suitable_loan,
            "affordable_emi": self._handle_affordable_emi,
            "reduce_risk": self._handle_reduce_risk,
            "general_advice": self._handle_general_advice,
        }

        handler = handler_map.get(intent, self._handle_general_advice)
        response_text, follow_up = handler(ctx)

        return {
            "response": response_text,
            "intent": intent,
            "confidence": confidence,
            "suggestions": follow_up,
        }

    def get_suggestions(self) -> list[str]:
        """Return starter suggestions for the chat interface.

        Returns:
            A list of 6 suggested questions the user can tap on.
        """
        return [
            "Why was my loan application rejected?",
            "Why is my CIBIL score low?",
            "How can I improve my credit score?",
            "What loan am I eligible for?",
            "How much EMI can I afford?",
            "How can I reduce my financial risk?",
        ]

    # ------------------------------------------------------------------
    # Intent handlers
    # ------------------------------------------------------------------

    @staticmethod
    def _handle_loan_rejection(
        ctx: dict[str, Any],
    ) -> tuple[str, list[str]]:
        """Explain possible reasons for loan rejection.

        Args:
            ctx: Financial context dict.

        Returns:
            ``(response_text, follow_up_suggestions)``
        """
        score = ctx.get("credit_score", 0)
        debt_ratio = ctx.get("debt_to_income_ratio", 0.0)
        payment_history = ctx.get("payment_history_pct", 1.0)
        utilization = ctx.get("credit_utilization", 0.0)
        inquiries = ctx.get("recent_inquiries", 0)

        reasons: list[str] = []

        if score and score < 650:
            reasons.append(
                f"Your CIBIL score is {score}, which is below the 650+ threshold "
                "most banks require for unsecured loans."
            )

        if debt_ratio > 0.40:
            reasons.append(
                f"Your debt-to-income ratio is {debt_ratio:.0%}, exceeding the "
                "typical 40% cap that lenders allow."
            )

        if payment_history < 0.90:
            reasons.append(
                f"Your on-time payment history ({payment_history:.0%}) shows late or "
                "missed payments, which lenders weigh heavily."
            )

        if utilization > 0.50:
            reasons.append(
                f"Your credit utilization is {utilization:.0%} — well above the "
                "recommended 30%, signaling over-reliance on credit."
            )

        if inquiries > 3:
            reasons.append(
                f"You have {inquiries} recent credit inquiries. Multiple hard pulls "
                "suggest aggressive credit-seeking and raise red flags."
            )

        if not reasons:
            reasons.append(
                "Based on the information available, your profile appears reasonable. "
                "The rejection may be due to factors like a short credit history, "
                "employer profile, or internal lender policies."
            )

        intro = "Here are the likely reasons your loan application was not approved:\n\n"
        body = "\n".join(f"• {r}" for r in reasons)
        closing = (
            "\n\nI recommend checking your CIBIL report at www.cibil.com for "
            "any errors and addressing the factors above before reapplying."
        )

        follow_up = [
            "How can I improve my CIBIL score?",
            "What loan might I still be eligible for?",
            "How long before I should reapply?",
        ]
        return intro + body + closing, follow_up

    @staticmethod
    def _handle_low_score(
        ctx: dict[str, Any],
    ) -> tuple[str, list[str]]:
        """Explain reasons behind a low credit score.

        Args:
            ctx: Financial context dict.

        Returns:
            ``(response_text, follow_up_suggestions)``
        """
        score = ctx.get("credit_score", 0)
        factors: list[str] = []

        payment_hist = ctx.get("payment_history_pct", 1.0)
        if payment_hist < 0.95:
            factors.append(
                f"Late or missed payments (your on-time rate is {payment_hist:.0%}). "
                "Payment history is the single biggest factor in CIBIL scoring."
            )

        util = ctx.get("credit_utilization", 0.0)
        if util > 0.30:
            factors.append(
                f"High credit utilization ({util:.0%}). Keeping usage below 30% "
                "of your total credit limit is crucial."
            )

        history_months = ctx.get("credit_history_length_months", 0)
        if history_months < 36:
            factors.append(
                f"Short credit history ({history_months} months). Lenders prefer "
                "applicants with at least 3 years of credit history."
            )

        inquiries = ctx.get("recent_inquiries", 0)
        if inquiries > 2:
            factors.append(
                f"{inquiries} recent hard inquiries on your report. Each inquiry "
                "can reduce your score by 5-10 points."
            )

        debt = ctx.get("total_debt", 0)
        income = ctx.get("annual_income", 1)
        if income > 0 and debt / income > 0.40:
            factors.append(
                f"High debt burden (₹{debt:,.0f} against ₹{income:,.0f} annual income). "
                "A high debt-to-income ratio drags your score down."
            )

        if not factors:
            factors.append(
                "Your profile doesn't show obvious red flags. Consider pulling "
                "your full CIBIL report to check for inaccuracies or settled accounts."
            )

        score_note = f"Your current CIBIL score is **{score}**. " if score else ""
        intro = f"{score_note}Here's what may be pulling your score down:\n\n"
        body = "\n".join(f"• {f}" for f in factors)

        follow_up = [
            "How can I improve my score?",
            "Will my score improve if I pay off debt?",
            "How long does it take to rebuild credit?",
        ]
        return intro + body, follow_up

    @staticmethod
    def _handle_improve_score(
        ctx: dict[str, Any],
    ) -> tuple[str, list[str]]:
        """Provide actionable tips to improve the credit score.

        Args:
            ctx: Financial context dict.

        Returns:
            ``(response_text, follow_up_suggestions)``
        """
        tips: list[str] = []

        payment_hist = ctx.get("payment_history_pct", 1.0)
        if payment_hist < 0.98:
            tips.append(
                "**Pay every EMI and credit card bill on time.** Set up NACH/auto-debit "
                "mandates so you never miss a due date. This single change has the "
                "biggest impact on your CIBIL score."
            )

        util = ctx.get("credit_utilization", 0.0)
        if util > 0.30:
            tips.append(
                f"**Reduce credit utilization from {util:.0%} to below 30%.** Pay down "
                "outstanding card balances or request a credit-limit increase from "
                "your bank."
            )

        tips.extend(
            [
                "**Don't close old credit accounts.** The length of your credit history "
                "contributes ~15% to your score. Keep your oldest card active.",
                "**Limit hard inquiries.** Apply for new credit only when necessary. "
                "Space out applications by at least 6 months.",
                "**Maintain a healthy credit mix.** Having both revolving credit (cards) "
                "and instalment loans (home/auto) demonstrates responsible borrowing.",
                "**Check your CIBIL report for errors.** Dispute any inaccurate late "
                "payments, wrong balances, or accounts that aren't yours.",
                "**Start a SIP or recurring deposit.** While not directly on your CIBIL "
                "report, building savings reduces your reliance on credit.",
            ]
        )

        intro = "Here's a step-by-step plan to boost your CIBIL score:\n\n"
        body = "\n".join(f"{i+1}. {t}" for i, t in enumerate(tips[:7]))

        follow_up = [
            "How long will it take to see improvement?",
            "Should I take a secured credit card?",
            "What is a good CIBIL score to aim for?",
        ]
        return intro + body, follow_up

    @staticmethod
    def _handle_suitable_loan(
        ctx: dict[str, Any],
    ) -> tuple[str, list[str]]:
        """Recommend loan types based on the user's profile.

        Args:
            ctx: Financial context dict.

        Returns:
            ``(response_text, follow_up_suggestions)``
        """
        score = ctx.get("credit_score", 0)
        income = ctx.get("annual_income", 0)
        monthly_income = income / 12 if income else ctx.get("monthly_income", 0)
        debt_ratio = ctx.get("debt_to_income_ratio", 0.0)

        recommendations: list[str] = []

        if score >= 750:
            recommendations.append(
                "**Home Loan** — With a 750+ CIBIL score, you qualify for the best "
                "interest rates (8.25-8.75% p.a.) from top banks like SBI, HDFC, and ICICI."
            )
            recommendations.append(
                "**Personal Loan** — Pre-approved personal loans at competitive rates "
                "(10-12% p.a.) from your existing bank."
            )
            if monthly_income >= 50_000:
                recommendations.append(
                    "**Car Loan** — Attractive rates (8.5-9.5% p.a.) for new vehicles "
                    "with up to 90% on-road price financing."
                )
        elif score >= 650:
            recommendations.append(
                "**Personal Loan** — You're eligible for personal loans at 13-16% p.a. "
                "Consider lenders like Bajaj Finserv or IDFC FIRST."
            )
            if debt_ratio < 0.40:
                recommendations.append(
                    "**Home Loan** — Possible at 9-10% p.a. with a higher down payment "
                    "(20-25%). Improve your score to 750+ for better rates."
                )
            recommendations.append(
                "**Gold Loan** — Secured against gold, these loans don't depend heavily "
                "on CIBIL and offer rates as low as 7-9% p.a."
            )
        elif score >= 500:
            recommendations.append(
                "**Secured Credit Card** — Deposit-backed cards from banks like ICICI, "
                "Axis, or Kotak to rebuild your credit history."
            )
            recommendations.append(
                "**Gold Loan** — Available even with a low CIBIL score at 8-10% p.a."
            )
            recommendations.append(
                "**Loan Against Fixed Deposit** — Borrow up to 90% of your FD at "
                "FD rate + 1-2%, with no CIBIL dependency."
            )
        else:
            recommendations.append(
                "**Focus on rebuilding credit first.** With a score below 500, most "
                "formal lenders will decline your application."
            )
            recommendations.append(
                "**Secured Credit Card** — Start with a deposit-backed card and use it "
                "responsibly for 6-12 months to rebuild."
            )
            recommendations.append(
                "**Microfinance or NBFC Loans** — Some NBFCs cater to lower-score "
                "borrowers, but interest rates will be 24-36% p.a."
            )

        score_text = f"Based on your CIBIL score of **{score}**" if score else "Based on your profile"
        income_text = f" and monthly income of **₹{monthly_income:,.0f}**" if monthly_income else ""
        intro = f"{score_text}{income_text}, here are my recommendations:\n\n"
        body = "\n".join(f"• {r}" for r in recommendations)

        follow_up = [
            "How much EMI can I afford?",
            "What documents do I need for a home loan?",
            "Which bank offers the lowest interest rate?",
        ]
        return intro + body, follow_up

    @staticmethod
    def _handle_affordable_emi(
        ctx: dict[str, Any],
    ) -> tuple[str, list[str]]:
        """Calculate affordable EMI and loan capacity.

        Args:
            ctx: Financial context dict.

        Returns:
            ``(response_text, follow_up_suggestions)``
        """
        income = ctx.get("annual_income", 0)
        monthly_income = income / 12 if income else ctx.get("monthly_income", 0)
        expenses = ctx.get("monthly_expenses", 0)
        existing_emi = ctx.get("existing_emi", 0)

        if not monthly_income:
            return (
                "I need your monthly income details to calculate EMI affordability. "
                "Please provide your annual or monthly income.",
                ["What is a safe EMI-to-income ratio?", "How is EMI calculated?"],
            )

        # Banks typically allow up to 40-50% of net income for total EMIs
        max_emi_ratio = 0.40
        total_available = monthly_income * max_emi_ratio
        net_affordable_emi = max(total_available - existing_emi, 0)

        # Conservative recommendation: use 50-60% of what's technically allowed
        recommended_emi = net_affordable_emi * 0.6

        # Estimate loan amounts at various tenures (at ~10% p.a.)
        rate_monthly = 10.0 / (12 * 100)

        def max_loan(emi: float, tenure_months: int) -> float:
            if rate_monthly == 0 or emi <= 0:
                return 0.0
            return emi * ((1 - (1 + rate_monthly) ** -tenure_months) / rate_monthly)

        loan_3y = max_loan(recommended_emi, 36)
        loan_5y = max_loan(recommended_emi, 60)
        loan_7y = max_loan(recommended_emi, 84)

        response = (
            f"**EMI Affordability Analysis**\n\n"
            f"• Monthly income: ₹{monthly_income:,.0f}\n"
            f"• Monthly expenses: ₹{expenses:,.0f}\n"
            f"• Existing EMIs: ₹{existing_emi:,.0f}\n"
            f"• Maximum EMI capacity (40% rule): **₹{net_affordable_emi:,.0f}**\n"
            f"• Recommended comfortable EMI: **₹{recommended_emi:,.0f}**\n\n"
            f"At the recommended EMI of ₹{recommended_emi:,.0f} (at ~10% p.a.):\n"
            f"• 3-year loan: up to **₹{loan_3y:,.0f}**\n"
            f"• 5-year loan: up to **₹{loan_5y:,.0f}**\n"
            f"• 7-year loan: up to **₹{loan_7y:,.0f}**\n\n"
            f"💡 **Tip:** Keep total EMIs below 40% of your monthly income to "
            f"maintain a healthy FOIR (Fixed Obligation to Income Ratio)."
        )

        follow_up = [
            "What loan amount can I get with this EMI?",
            "How does loan tenure affect total interest paid?",
            "Should I choose a shorter or longer tenure?",
        ]
        return response, follow_up

    @staticmethod
    def _handle_reduce_risk(
        ctx: dict[str, Any],
    ) -> tuple[str, list[str]]:
        """Provide risk reduction strategies.

        Args:
            ctx: Financial context dict.

        Returns:
            ``(response_text, follow_up_suggestions)``
        """
        risk_category = ctx.get("risk_category", "UNKNOWN")
        score = ctx.get("credit_score", 0)

        strategies: list[str] = [
            "**Build an emergency fund** — Save at least 6 months of expenses in a "
            "liquid fund or high-yield savings account (e.g., Paytm Payments Bank, "
            "Fi Money).",
            "**Insure adequately** — Ensure you have term life insurance (10× annual "
            "income) and a ₹10-25 lakh health insurance (family floater).",
            "**Diversify income** — Reduce dependence on a single income source. "
            "Explore freelance work, rental income, or dividend-paying investments.",
            "**Reduce high-interest debt** — Pay off credit card revolving balances "
            "and personal loans first. These carry 14-42% p.a. interest.",
            "**Automate savings** — Set up a monthly SIP in a diversified equity "
            "mutual fund and a recurring deposit for short-term goals.",
            "**Monitor your CIBIL report** — Check quarterly for errors, fraudulent "
            "accounts, or identity theft. Dispute inaccuracies promptly.",
        ]

        risk_note = ""
        if risk_category == "HIGH":
            risk_note = (
                f"\n\n⚠️ You are currently in the **HIGH** risk category "
                f"(CIBIL: {score}). Immediate action on debt reduction and payment "
                f"regularity is strongly recommended."
            )
        elif risk_category == "MEDIUM":
            risk_note = (
                f"\n\nYour risk level is **MEDIUM** (CIBIL: {score}). You're on "
                f"the right track but can do more to strengthen your position."
            )

        intro = "Here are strategies to reduce your overall financial risk:\n\n"
        body = "\n".join(f"{i+1}. {s}" for i, s in enumerate(strategies))

        follow_up = [
            "What is the best way to pay off debt?",
            "How much emergency fund do I need?",
            "Should I invest or pay off loans first?",
        ]
        return intro + body + risk_note, follow_up

    @staticmethod
    def _handle_general_advice(
        ctx: dict[str, Any],
    ) -> tuple[str, list[str]]:
        """Provide general financial advice.

        Args:
            ctx: Financial context dict.

        Returns:
            ``(response_text, follow_up_suggestions)``
        """
        score = ctx.get("credit_score", 0)
        income = ctx.get("annual_income", 0)

        advice_points: list[str] = [
            "**Follow the 50-30-20 rule** — Allocate 50% of income to needs, "
            "30% to wants, and 20% to savings and investments.",
            "**Start investing early** — Even ₹500/month in a SIP can grow "
            "significantly over 10-15 years thanks to compounding.",
            "**Create a budget** — Use SpendiFy to track every rupee. "
            "Awareness is the first step to financial control.",
            "**Protect your wealth** — Get adequate term insurance and health "
            "insurance before investing in market-linked products.",
            "**Avoid lifestyle inflation** — When your income grows, increase "
            "savings proportionally instead of expenses.",
            "**Set clear financial goals** — Whether it's buying a home, "
            "children's education, or retirement — quantify each goal and "
            "work backwards to determine monthly savings needed.",
        ]

        score_context = ""
        if score:
            if score >= 750:
                score_context = (
                    f"\n\n✅ With a CIBIL score of **{score}**, you're in excellent "
                    "shape. Focus on maintaining this score and optimising investments."
                )
            elif score >= 650:
                score_context = (
                    f"\n\n📊 Your CIBIL score of **{score}** is good but has room "
                    "for improvement. Consistent on-time payments will push it higher."
                )
            else:
                score_context = (
                    f"\n\n⚠️ Your CIBIL score of **{score}** needs attention. "
                    "Prioritise clearing overdue payments and reducing debt."
                )

        intro = "Here are some key financial tips tailored for you:\n\n"
        body = "\n".join(f"{i+1}. {a}" for i, a in enumerate(advice_points))

        follow_up = [
            "How can I improve my credit score?",
            "What loan options do I have?",
            "How much EMI can I afford?",
        ]
        return intro + body + score_context, follow_up
