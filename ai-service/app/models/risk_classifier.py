"""
SpendiFy AI Service - Risk Classifier Module.

Classifies borrowers into LOW, MEDIUM, or HIGH risk categories using a
trained Random Forest model. Falls back to a weighted heuristic when the
model artifact is unavailable.
"""

import logging
from pathlib import Path
from typing import Any, Dict, Optional

import numpy as np

logger = logging.getLogger(__name__)

# Canonical risk labels in ascending severity order
_RISK_LABELS: tuple[str, ...] = ("LOW", "MEDIUM", "HIGH")


class RiskClassifier:
    """Risk classification engine backed by Random Forest with heuristic fallback.

    The classifier loads a pre-trained scikit-learn Random Forest from disk.
    If the file is missing or loading fails, it uses a weighted composite
    score to determine the risk category.

    Heuristic formula::

        risk_score = 0.35 × expense_ratio
                   + 0.35 × debt_to_income
                   + 0.30 × (1 − savings_ratio)

    Thresholds:
        * risk_score < 0.35 → LOW
        * risk_score < 0.65 → MEDIUM
        * otherwise         → HIGH

    Attributes:
        model: The loaded Random Forest classifier, or ``None``.
        model_dir: Directory containing serialised model artifacts.
        _using_fallback: Whether the heuristic is active.
    """

    _LOW_THRESHOLD: float = 0.35
    _HIGH_THRESHOLD: float = 0.65

    def __init__(self, model_dir: str = "trained_models") -> None:
        """Initialise the risk classifier.

        Attempts to load a Random Forest model from
        ``<model_dir>/risk_classifier.joblib``. If loading fails the
        heuristic fallback is activated.

        Args:
            model_dir: Path to the directory containing trained model files.
        """
        self.model_dir: str = model_dir
        self.model: Optional[Any] = None
        self._using_fallback: bool = False

        model_path = Path(model_dir) / "risk_classifier.joblib"
        try:
            import joblib  # type: ignore[import-untyped]

            if model_path.exists():
                self.model = joblib.load(model_path)
                logger.info("RiskClassifier: loaded RF model from %s", model_path)
            else:
                logger.warning(
                    "RiskClassifier: model file not found at %s – using heuristic fallback",
                    model_path,
                )
                self._using_fallback = True
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "RiskClassifier: failed to load model (%s) – using heuristic fallback",
                exc,
            )
            self._using_fallback = True

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def classify(self, features: np.ndarray) -> str:
        """Classify a borrower into a risk category.

        Args:
            features: 1-D or 2-D NumPy array of borrower features.

        Returns:
            One of ``"LOW"``, ``"MEDIUM"``, or ``"HIGH"``.
        """
        flat = np.asarray(features, dtype=np.float64).flatten()

        if self.model is not None and not self._using_fallback:
            try:
                reshaped = flat.reshape(1, -1)
                prediction = self.model.predict(reshaped)
                label = str(prediction[0]).upper()
                if label in _RISK_LABELS:
                    return label
                # Model returned an integer class index
                try:
                    return _RISK_LABELS[int(prediction[0])]
                except (ValueError, IndexError):
                    pass
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "RiskClassifier: model prediction failed (%s) – falling back to heuristic",
                    exc,
                )

        return self._heuristic_classify(flat)

    def get_probabilities(self, features: np.ndarray) -> Dict[str, float]:
        """Return per-class risk probabilities.

        Args:
            features: 1-D or 2-D NumPy array of borrower features.

        Returns:
            Dictionary with keys ``"low"``, ``"medium"``, ``"high"`` mapping
            to their respective probabilities (summing to ~1.0).
        """
        flat = np.asarray(features, dtype=np.float64).flatten()

        if self.model is not None and not self._using_fallback:
            try:
                reshaped = flat.reshape(1, -1)
                proba = self.model.predict_proba(reshaped)[0]
                # Map model class order to our canonical labels
                classes = [str(c).upper() for c in self.model.classes_]
                prob_map: Dict[str, float] = {}
                for label in ("LOW", "MEDIUM", "HIGH"):
                    if label in classes:
                        prob_map[label.lower()] = float(proba[classes.index(label)])
                    else:
                        prob_map[label.lower()] = 0.0
                return prob_map
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "RiskClassifier: predict_proba failed (%s) – falling back to heuristic",
                    exc,
                )

        return self._heuristic_probabilities(flat)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _compute_risk_score(self, flat_features: np.ndarray) -> float:
        """Compute the composite heuristic risk score.

        Formula::

            risk_score = 0.35 × expense_ratio
                       + 0.35 × debt_to_income
                       + 0.30 × (1 − savings_ratio)

        Args:
            flat_features: Flattened feature array where:
                * index 0 → expense_ratio
                * index 1 → debt_to_income
                * index 2 → savings_ratio

        Returns:
            Composite risk score in [0, 1].
        """
        expense_ratio: float = float(flat_features[0]) if len(flat_features) > 0 else 0.5
        debt_to_income: float = float(flat_features[1]) if len(flat_features) > 1 else 0.3
        savings_ratio: float = float(flat_features[2]) if len(flat_features) > 2 else 0.1

        risk_score: float = (
            0.35 * expense_ratio
            + 0.35 * debt_to_income
            + 0.30 * (1.0 - savings_ratio)
        )
        return float(np.clip(risk_score, 0.0, 1.0))

    def _heuristic_classify(self, flat_features: np.ndarray) -> str:
        """Classify using the composite risk score with fixed thresholds.

        Args:
            flat_features: Flattened feature array.

        Returns:
            ``"LOW"``, ``"MEDIUM"``, or ``"HIGH"``.
        """
        risk_score = self._compute_risk_score(flat_features)

        if risk_score < self._LOW_THRESHOLD:
            return "LOW"
        if risk_score < self._HIGH_THRESHOLD:
            return "MEDIUM"
        return "HIGH"

    def _heuristic_probabilities(self, flat_features: np.ndarray) -> Dict[str, float]:
        """Derive pseudo-probabilities from the heuristic risk score.

        Uses a simple triangular membership approach centred on the
        risk-score thresholds so that the three probabilities always
        sum to 1.0.

        Args:
            flat_features: Flattened feature array.

        Returns:
            Probability dictionary with keys ``"low"``, ``"medium"``, ``"high"``.
        """
        risk_score = self._compute_risk_score(flat_features)

        # Triangular membership-style soft classification
        if risk_score < self._LOW_THRESHOLD:
            # Firmly in LOW territory
            low_p: float = 1.0 - risk_score / self._LOW_THRESHOLD
            medium_p: float = risk_score / self._LOW_THRESHOLD
            high_p: float = 0.0
        elif risk_score < self._HIGH_THRESHOLD:
            # In MEDIUM territory
            normalised = (risk_score - self._LOW_THRESHOLD) / (
                self._HIGH_THRESHOLD - self._LOW_THRESHOLD
            )
            low_p = max(0.0, 0.5 * (1.0 - normalised))
            high_p = max(0.0, 0.5 * normalised)
            medium_p = 1.0 - low_p - high_p
        else:
            # Firmly in HIGH territory
            overshoot = min(risk_score - self._HIGH_THRESHOLD, 1.0 - self._HIGH_THRESHOLD)
            range_size = 1.0 - self._HIGH_THRESHOLD if (1.0 - self._HIGH_THRESHOLD) > 0 else 1.0
            high_p = 0.5 + 0.5 * (overshoot / range_size)
            medium_p = 1.0 - high_p
            low_p = 0.0

        # Normalise to ensure sum == 1.0
        total = low_p + medium_p + high_p
        if total > 0:
            low_p /= total
            medium_p /= total
            high_p /= total

        return {
            "low": round(low_p, 6),
            "medium": round(medium_p, 6),
            "high": round(high_p, 6),
        }
