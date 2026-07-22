"""
SpendiFy AI Service - Default Predictor Module.

Wraps the CreditScorer to provide default probability predictions with
confidence intervals. Uses lazy initialisation to defer model loading
until the first prediction is requested.
"""

import logging
import math
from typing import Dict, Optional

import numpy as np

from app.models.credit_scorer import CreditScorer

logger = logging.getLogger(__name__)


class DefaultPredictor:
    """Predicts loan default probability with confidence intervals.

    This class lazily instantiates a :class:`CreditScorer` on first use.
    Confidence intervals are derived using the Wilson score interval
    (normal approximation) to give interpretable uncertainty bounds
    around the point estimate.

    Attributes:
        _scorer: Lazily-loaded :class:`CreditScorer` instance.
        _model_dir: Directory forwarded to the underlying scorer.
    """

    # Default number of pseudo-observations for Wilson interval width.
    # Higher values narrow the interval (more confident).
    _PSEUDO_N: int = 200

    def __init__(self, model_dir: str = "trained_models") -> None:
        """Initialise the default predictor.

        The underlying :class:`CreditScorer` is **not** loaded here; it is
        created on the first call to :meth:`predict_probability` or
        :meth:`predict_with_confidence`.

        Args:
            model_dir: Path forwarded to the :class:`CreditScorer` constructor.
        """
        self._model_dir: str = model_dir
        self._scorer: Optional[CreditScorer] = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _ensure_scorer(self) -> CreditScorer:
        """Lazy-load the CreditScorer on first access.

        Returns:
            The initialised :class:`CreditScorer` instance.
        """
        if self._scorer is None:
            logger.info("DefaultPredictor: lazily initialising CreditScorer")
            self._scorer = CreditScorer(model_dir=self._model_dir)
        return self._scorer

    @staticmethod
    def _wilson_interval(
        probability: float,
        n: int,
        z: float = 1.96,
    ) -> tuple[float, float]:
        """Compute a Wilson score confidence interval.

        The Wilson interval provides better coverage than the naïve
        normal approximation, especially for probabilities near 0 or 1.

        Args:
            probability: Point estimate of default probability.
            n: Number of pseudo-observations (controls interval width).
            z: Z-score for the desired confidence level (1.96 ≈ 95%).

        Returns:
            Tuple of (lower_bound, upper_bound), each clipped to [0, 1].
        """
        p = float(np.clip(probability, 1e-8, 1.0 - 1e-8))
        denominator = 1.0 + (z * z) / n
        centre = p + (z * z) / (2.0 * n)
        spread = z * math.sqrt((p * (1.0 - p)) / n + (z * z) / (4.0 * n * n))

        lower = (centre - spread) / denominator
        upper = (centre + spread) / denominator

        return (
            float(np.clip(lower, 0.0, 1.0)),
            float(np.clip(upper, 0.0, 1.0)),
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def predict_probability(self, features: np.ndarray) -> float:
        """Predict the probability of loan default.

        Delegates to :meth:`CreditScorer.predict_default_probability`.

        Args:
            features: 1-D or 2-D NumPy array of borrower features.

        Returns:
            Default probability in the range [0.0, 1.0].
        """
        scorer = self._ensure_scorer()
        return scorer.predict_default_probability(features)

    def predict_with_confidence(
        self,
        features: np.ndarray,
        confidence_level: float = 0.95,
    ) -> Dict[str, float]:
        """Predict default probability with a confidence interval.

        Returns:
            Dictionary with keys:
                - ``probability``  – point estimate of default probability
                - ``lower_bound``  – lower bound of the confidence interval
                - ``upper_bound``  – upper bound of the confidence interval

        Args:
            features: 1-D or 2-D NumPy array of borrower features.
            confidence_level: Desired confidence level (default 0.95).
                Supported values are mapped to their z-scores internally.
        """
        probability: float = self.predict_probability(features)

        # Map common confidence levels to z-scores
        z_map: Dict[float, float] = {
            0.90: 1.645,
            0.95: 1.960,
            0.99: 2.576,
        }
        z: float = z_map.get(round(confidence_level, 2), 1.960)

        lower, upper = self._wilson_interval(
            probability,
            n=self._PSEUDO_N,
            z=z,
        )

        return {
            "probability": round(probability, 6),
            "lower_bound": round(lower, 6),
            "upper_bound": round(upper, 6),
        }
