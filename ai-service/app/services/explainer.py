import json
import logging
from pathlib import Path
from typing import Any
import numpy as np
import shap
import xgboost as xgb

logger = logging.getLogger(__name__)

class SHAPExplainer:
    def __init__(self, model_dir: str = "trained_models") -> None:
        self.model = None
        self.explainer = None
        self.feature_names = []

        model_path = Path(model_dir) / "credit_scorer.joblib"
        feature_names_path = Path(model_dir) / "feature_names.json"

        if feature_names_path.exists():
            with open(feature_names_path, "r", encoding="utf-8") as fh:
                self.feature_names = json.load(fh)

        if model_path.exists():
            import joblib
            self.model = joblib.load(model_path)
            self.explainer = shap.TreeExplainer(self.model)

    def explain(self, features: np.ndarray) -> list[dict[str, Any]]:
        if self.explainer is None:
            return []

        # Explain using the TreeExplainer
        shap_values = self.explainer.shap_values(features.reshape(1, -1))
        if isinstance(shap_values, list):
            shap_values = shap_values[0]
        shap_arr = np.asarray(shap_values).flatten()

        explanations = []
        for idx in range(min(len(shap_arr), len(self.feature_names))):
            name = self.feature_names[idx]
            sv = float(shap_arr[idx])
            fv = float(features[idx]) if idx < len(features) else 0.0
            impact = "positive" if sv < 0 else "negative" # sv < 0 means it reduces default probability
            
            explanations.append({
                "feature_name": name,
                "feature_value": round(fv, 4),
                "shap_value": round(sv, 6),
                "impact": impact,
                "description": f"Feature {name} with value {fv} contributed {sv:.4f} to the default probability log-odds."
            })

        explanations.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        return explanations[:10]
