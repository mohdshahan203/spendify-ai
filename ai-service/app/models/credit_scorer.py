"""
SpendiFy AI Service - Credit Scorer Module.

Provides credit score prediction using a trained XGBoost model with a
heuristic fallback when the model artifact is unavailable. Converts default
probabilities to a 300-900 credit score using a log-odds scaling formula.
"""

import logging
import math
from pathlib import Path
from typing import Any, Dict, Optional

import numpy as np

logger = logging.getLogger(__name__)


class CreditScorer:
    """Credit scoring engine backed by XGBoost with heuristic fallback.

    The scorer loads a pre-trained XGBoost classifier from disk. If the model
    file is missing or corrupted, it falls back to a rule-based heuristic that
    uses expense ratio, debt-to-income ratio, and savings ratio to estimate
    default probability.

    Attributes:
        model: The loaded XGBoost model, or ``None`` if unavailable.
        model_dir: Directory containing serialised model artifacts.
        _using_fallback: Whether the heuristic is active instead of the model.
    """

    # Score-scaling constants (Points-to-Double-the-Odds methodology)
    _BASE_SCORE: int = 600
    _BASE_ODDS: float = 50.0
    _PDO: int = 20  # points to double the odds
    _SCORE_MIN: int = 300
    _SCORE_MAX: int = 900

    # Heuristic constants
    _HEURISTIC_BASE_PROB: float = 0.15

    def __init__(self, model_dir: str = "trained_models") -> None:
        """Initialise the credit scorer.

        Attempts to load an XGBoost model from ``<model_dir>/credit_scorer.joblib``.
        If the file is absent or loading fails, the scorer logs a warning and
        activates the heuristic fallback.

        Args:
            model_dir: Path to the directory containing trained model files.
        """
        self.model_dir: str = model_dir
        self.model: Optional[Any] = None
        self._using_fallback: bool = False

        model_path = Path(model_dir) / "credit_scorer.joblib"
        if not model_path.exists():
            model_path = Path(__file__).resolve().parent.parent.parent / "trained_models" / "credit_scorer.joblib"

        try:
            import joblib  # type: ignore[import-untyped]

            if model_path.exists():
                self.model = joblib.load(model_path)
                logger.info("CreditScorer: loaded XGBoost model from %s", model_path)
            else:
                logger.warning(
                    "CreditScorer: model file not found at %s – using heuristic fallback",
                    model_path,
                )
                self._using_fallback = True
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "CreditScorer: failed to load model (%s) – using heuristic fallback",
                exc,
            )
            self._using_fallback = True

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def predict_default_probability(self, features: np.ndarray) -> float:
        """Predict the probability that a borrower will default.

        When a trained model is available the prediction is delegated to it.
        Otherwise a heuristic is applied:

        * **Base probability**: 0.15
        * Increased by ``0.25 × expense_ratio`` (feature index 0)
        * Increased by ``0.35 × debt_to_income`` (feature index 1)
        * Decreased by ``0.20 × savings_ratio``  (feature index 2)

        The result is clipped to [0, 1].

        Args:
            features: 1-D or 2-D NumPy array of borrower features.

        Returns:
            Default probability in the range [0.0, 1.0].
        """
        flat = np.asarray(features, dtype=np.float64).flatten()

        if self.model is not None and not self._using_fallback:
            try:
                reshaped = flat.reshape(1, -1)
                probabilities = self.model.predict_proba(reshaped)
                # Class 1 = default
                return float(np.clip(probabilities[0, 1], 0.0, 1.0))
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "CreditScorer: model prediction failed (%s) – falling back to heuristic",
                    exc,
                )

        return self._heuristic_default_probability(flat)

    def probability_to_score(self, probability: float) -> int:
        """Convert a default probability to a credit score (300-900).

        Uses a log-odds (PDO) scaling formula::

            factor = PDO / ln(2)
            offset = base_score - factor × ln(base_odds)
            score  = offset - factor × ln(odds)

        where ``odds = (1 - probability) / probability``.

        Args:
            probability: Default probability in (0, 1). Values at the
                boundaries are clamped to avoid division-by-zero.

        Returns:
            Integer credit score clipped to [300, 900].
        """
        # Guard against edge cases
        probability = float(np.clip(probability, 1e-6, 1.0 - 1e-6))

        odds: float = (1.0 - probability) / probability
        factor: float = self._PDO / math.log(2.0)
        offset: float = self._BASE_SCORE - factor * math.log(self._BASE_ODDS)
        score: float = offset - factor * math.log(odds)

        return int(np.clip(round(score), self._SCORE_MIN, self._SCORE_MAX))

    def predict(self, features: np.ndarray) -> Dict[str, float]:
        """Run a full credit-scoring pipeline on borrower features.

        Returns:
            Dictionary with keys:
                - ``score``                – integer credit score (300-900)
                - ``default_probability``  – estimated probability of default
                - ``approval_probability`` – 1 − default_probability
        """
        default_prob: float = self.predict_default_probability(features)
        score: int = self.probability_to_score(default_prob)
        approval_prob: float = round(1.0 - default_prob, 6)

        return {
            "score": score,
            "default_probability": round(default_prob, 6),
            "approval_probability": approval_prob,
        }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _heuristic_default_probability(self, flat_features: np.ndarray) -> float:
        """Compute a rule-based default probability from feature values.

        The heuristic adjusts a base probability (0.15) using three key ratios
        extracted from ``flat_features``:

        * Index 0 → expense_ratio   (weight +0.25)
        * Index 1 → debt_to_income  (weight +0.35)
        * Index 2 → savings_ratio   (weight −0.20)

        Args:
            flat_features: Flattened 1-D feature array.

        Returns:
            Default probability clipped to [0.0, 1.0].
        """
        base_prob: float = self._HEURISTIC_BASE_PROB

        expense_ratio: float = float(flat_features[0]) if len(flat_features) > 0 else 0.5
        debt_to_income: float = float(flat_features[1]) if len(flat_features) > 1 else 0.3
        savings_ratio: float = float(flat_features[2]) if len(flat_features) > 2 else 0.1

        adjustment: float = (
            0.25 * expense_ratio
            + 0.35 * debt_to_income
            - 0.20 * savings_ratio
        )

        probability: float = base_prob + adjustment
        return float(np.clip(probability, 0.0, 1.0))
