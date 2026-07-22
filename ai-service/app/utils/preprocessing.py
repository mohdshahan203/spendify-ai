"""Data-preprocessing and feature-engineering utilities.

Provides helpers for cleaning raw transaction amounts, automatically
categorising Indian financial transactions, normalising feature
vectors, and handling missing values.
"""

from __future__ import annotations

import math
import re
from typing import Sequence

import numpy as np


# ---------------------------------------------------------------------------
# Amount cleaning
# ---------------------------------------------------------------------------

_CURRENCY_SYMBOLS_RE = re.compile(r"[₹$]|Rs\.?|INR", re.IGNORECASE)
_WHITESPACE_AND_COMMAS_RE = re.compile(r"[,\s]+")


def clean_amount(text: str) -> float:
    """Parse a human-readable monetary string into a float.

    Handles common Indian currency prefixes (``₹``, ``Rs``, ``INR``),
    thousands-separator commas, and parenthesised negative amounts
    (e.g. ``(1,500.00)`` → ``-1500.0``).

    Args:
        text: Raw amount string, e.g. ``"₹1,23,456.78"`` or ``"(500)"``.

    Returns:
        Parsed float value, or ``0.0`` if the string cannot be parsed.

    Examples:
        >>> clean_amount("₹1,23,456.78")
        123456.78
        >>> clean_amount("(500)")
        -500.0
        >>> clean_amount("INR 2,000.50")
        2000.5
        >>> clean_amount("invalid")
        0.0
    """
    if not text or not isinstance(text, str):
        return 0.0

    original = text.strip()

    # Detect parenthesised negatives: "(1,500.00)" -> negative
    is_negative = original.startswith("(") and original.endswith(")")
    if is_negative:
        original = original[1:-1].strip()

    # Also handle explicit minus sign
    if original.startswith("-"):
        is_negative = True
        original = original[1:].strip()

    # Strip currency symbols and whitespace
    cleaned = _CURRENCY_SYMBOLS_RE.sub("", original)
    cleaned = _WHITESPACE_AND_COMMAS_RE.sub("", cleaned)
    cleaned = cleaned.strip()

    if not cleaned:
        return 0.0

    try:
        value = float(cleaned)
    except (ValueError, OverflowError):
        return 0.0

    return -value if is_negative else value


# ---------------------------------------------------------------------------
# Transaction categorisation (Indian-focused)
# ---------------------------------------------------------------------------

# Mapping of category → keyword sets (all lowercase).
_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "SALARY": [
        "salary", "sal", "payroll", "wages", "stipend", "pension",
        "income", "pay",
    ],
    "RENT": [
        "rent", "lease", "landlord", "housing", "pg ", "hostel",
        "accommodation",
    ],
    "GROCERIES": [
        "grocery", "groceries", "bigbasket", "blinkit", "zepto",
        "dmart", "reliance fresh", "more supermarket", "supermarket",
        "kirana", "provision", "vegetables", "fruits",
    ],
    "UTILITIES": [
        "electricity", "electric", "power", "water bill", "gas bill",
        "utility", "broadband", "wifi", "internet", "jio", "airtel",
        "vodafone", "vi ", "bsnl", "tata sky", "dth", "recharge",
        "postpaid", "prepaid", "mobile bill", "phone bill",
    ],
    "EMI": [
        "emi", "loan", "equated monthly", "instalment", "installment",
        "bajaj finserv", "hdfc loan", "sbi loan", "lic housing",
        "home loan", "car loan", "personal loan", "education loan",
    ],
    "UPI": [
        "upi", "google pay", "gpay", "phonepe", "paytm", "bhim",
        "neft", "imps", "rtgs",
    ],
    "ATM": [
        "atm", "cash withdrawal", "cash deposit", "atm withdrawal",
        "atm deposit",
    ],
    "FOOD": [
        "swiggy", "zomato", "restaurant", "cafe", "hotel", "food",
        "dining", "eatery", "dominos", "pizza", "mcdonald", "kfc",
        "burger", "biryani", "canteen", "mess ", "tiffin",
    ],
    "SHOPPING": [
        "amazon", "flipkart", "myntra", "ajio", "meesho", "snapdeal",
        "shopping", "mall", "retail", "store", "purchase", "buy",
        "shop", "nykaa", "tata cliq",
    ],
    "TRANSPORT": [
        "uber", "ola", "rapido", "metro", "bus", "train", "irctc",
        "petrol", "diesel", "fuel", "parking", "toll", "fastag",
        "cab", "auto", "rickshaw", "transport", "travel",
    ],
    "MEDICAL": [
        "hospital", "medical", "medicine", "pharmacy", "doctor",
        "clinic", "diagnostic", "lab test", "health", "apollo",
        "medplus", "netmeds", "pharmeasy", "1mg",
    ],
    "EDUCATION": [
        "school", "college", "university", "tuition", "education",
        "course", "coaching", "udemy", "coursera", "byju",
        "unacademy", "exam", "book", "stationery",
    ],
    "ENTERTAINMENT": [
        "netflix", "hotstar", "prime video", "spotify", "movie",
        "theatre", "cinema", "game", "gaming", "subscription",
        "disney", "youtube premium", "entertainment",
    ],
    "INVESTMENT": [
        "mutual fund", "mf ", "sip", "stock", "share", "demat",
        "zerodha", "groww", "upstox", "investment", "trading",
        "nifty", "sensex", "fd ", "fixed deposit", "ppf",
        "nps", "national pension",
    ],
    "INSURANCE": [
        "insurance", "premium", "lic ", "policy", "cover",
        "mediclaim", "term plan", "health insurance",
        "motor insurance", "car insurance",
    ],
}


def categorize_transaction(description: str) -> str:
    """Classify a transaction description into a spending category.

    Uses keyword matching optimised for Indian banking narrations
    (UPI references, local brand names, Hindi transliterations, etc.).

    Args:
        description: Raw transaction narration text.

    Returns:
        One of the predefined category strings (e.g. ``"SALARY"``,
        ``"GROCERIES"``, ``"UPI"``), or ``"OTHER"`` if no keywords
        match.

    Examples:
        >>> categorize_transaction("NEFT-SALARY-JUNE-2024")
        'SALARY'
        >>> categorize_transaction("Swiggy order #12345")
        'FOOD'
        >>> categorize_transaction("Random narration xyz")
        'OTHER'
    """
    if not description:
        return "OTHER"

    desc_lower = description.lower()

    for category, keywords in _CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in desc_lower:
                return category

    return "OTHER"


# ---------------------------------------------------------------------------
# Feature normalisation
# ---------------------------------------------------------------------------

def normalize_features(
    features: dict[str, float],
    feature_names: Sequence[str],
) -> np.ndarray:
    """Apply min-max normalisation to a feature dictionary.

    Each feature is scaled individually using the formula::

        x_norm = (x - x_min) / (x_max - x_min)

    When ``x_min == x_max`` (zero variance), the normalised value is
    set to ``0.0`` to avoid division-by-zero.

    The predefined per-feature min/max ranges are tailored to typical
    Indian personal-finance data.

    Args:
        features: Mapping of feature name → raw numeric value.
        feature_names: Ordered list of feature names that determines
            the column order of the returned array.

    Returns:
        A 1-D NumPy array of normalised feature values in the order
        specified by *feature_names*.

    Examples:
        >>> normalize_features({"income": 50000, "debt": 10000},
        ...                    ["income", "debt"])
        array([...])
    """
    # Sensible defaults for Indian personal-finance features.
    _feature_ranges: dict[str, tuple[float, float]] = {
        "monthly_income": (0.0, 500_000.0),
        "monthly_expenses": (0.0, 400_000.0),
        "total_debt": (0.0, 10_000_000.0),
        "monthly_emi": (0.0, 200_000.0),
        "savings_balance": (0.0, 5_000_000.0),
        "credit_utilization": (0.0, 1.0),
        "num_active_loans": (0.0, 10.0),
        "num_credit_cards": (0.0, 10.0),
        "payment_history_score": (0.0, 1.0),
        "years_of_credit_history": (0.0, 40.0),
        "num_hard_inquiries": (0.0, 20.0),
        "age": (18.0, 80.0),
        "debt_to_income": (0.0, 5.0),
        "savings_ratio": (0.0, 1.0),
        "emi_to_income": (0.0, 1.0),
        "expense_to_income": (0.0, 1.0),
    }

    normalised: list[float] = []
    for name in feature_names:
        raw = float(features.get(name, 0.0))
        f_min, f_max = _feature_ranges.get(name, (0.0, 1.0))

        if f_max == f_min:
            normalised.append(0.0)
        else:
            value = (raw - f_min) / (f_max - f_min)
            # Clamp to [0, 1] to handle out-of-range inputs gracefully.
            value = max(0.0, min(1.0, value))
            normalised.append(value)

    return np.array(normalised, dtype=np.float64)


# ---------------------------------------------------------------------------
# Missing-value handling
# ---------------------------------------------------------------------------

def handle_missing_values(data: dict) -> dict:
    """Replace ``None`` and ``NaN`` values with ``0.0``.

    Operates on a **shallow copy** of the input dictionary so that the
    caller's original data is not mutated.

    Args:
        data: Arbitrary key → value mapping that may contain ``None``
            or ``float('nan')`` values.

    Returns:
        A new dictionary with all ``None`` / ``NaN`` values replaced
        by ``0.0``.  Non-numeric values that are not ``None`` are
        left unchanged.

    Examples:
        >>> handle_missing_values({"a": None, "b": float("nan"), "c": 5.0})
        {'a': 0.0, 'b': 0.0, 'c': 5.0}
    """
    cleaned: dict = {}
    for key, value in data.items():
        if value is None:
            cleaned[key] = 0.0
        elif isinstance(value, float) and math.isnan(value):
            cleaned[key] = 0.0
        else:
            cleaned[key] = value
    return cleaned
