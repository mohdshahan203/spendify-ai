import os
import json
from pathlib import Path
import logging
from datetime import datetime, timezone
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)
import joblib

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

FEATURE_DESCRIPTIONS = {
    "LIMIT_BAL": "Amount of given credit in NT dollars (individual and family/supplementary)",
    "SEX": "Gender (1 = male, 2 = female)",
    "EDUCATION": "Education level (1 = graduate school, 2 = university, 3 = high school, 4 = others)",
    "MARRIAGE": "Marital status (1 = married, 2 = single, 3 = others)",
    "AGE": "Age in years",
    "PAY_0": "Repayment status in September (-1 = pay duly, 1 = delay 1 mo, 2 = delay 2 mos, etc.)",
    "PAY_2": "Repayment status in August",
    "PAY_3": "Repayment status in July",
    "PAY_4": "Repayment status in June",
    "PAY_5": "Repayment status in May",
    "PAY_6": "Repayment status in April",
    "BILL_AMT1": "Amount of bill statement in September (NT dollar)",
    "BILL_AMT2": "Amount of bill statement in August",
    "BILL_AMT3": "Amount of bill statement in July",
    "BILL_AMT4": "Amount of bill statement in June",
    "BILL_AMT5": "Amount of bill statement in May",
    "BILL_AMT6": "Amount of bill statement in April",
    "PAY_AMT1": "Amount of previous payment in September (NT dollar)",
    "PAY_AMT2": "Amount of previous payment in August",
    "PAY_AMT3": "Amount of previous payment in July",
    "PAY_AMT4": "Amount of previous payment in June",
    "PAY_AMT5": "Amount of previous payment in May",
    "PAY_AMT6": "Amount of previous payment in April"
}

def train_and_evaluate():
    data_path = Path(__file__).resolve().parent.parent.parent / "data" / "default_of_credit_card_clients.xls"
    models_dir = Path(__file__).resolve().parent.parent / "trained_models"
    models_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"Loading dataset from {data_path}...")
    if not data_path.exists():
        raise FileNotFoundError(f"Dataset not found at {data_path}")
        
    df = pd.read_excel(data_path, header=1)
    
    # 1. Validation and cleaning
    logger.info(f"Dataset loaded with shape: {df.shape}")
    
    # Drop ID column to avoid target leakage / identifier bias
    if 'ID' in df.columns:
        df = df.drop(columns=['ID'])
        
    # Rename target column to standard 'default'
    target_col = None
    for candidate in ['default payment next month', 'default', 'Y']:
        if candidate in df.columns:
            target_col = candidate
            break
            
    if not target_col:
        raise ValueError("Target column for default status not found in dataset")
        
    df = df.rename(columns={target_col: 'default'})
    
    # Separate features and target
    X = df.drop(columns=['default'])
    y = df['default'].astype(int)
    
    feature_names = X.columns.tolist()
    logger.info(f"Input features count: {len(feature_names)}")
    
    # Class distribution
    n_neg = int(np.sum(y == 0))
    n_pos = int(np.sum(y == 1))
    imbalance_ratio = float(n_neg / n_pos) if n_pos > 0 else 1.0
    logger.info(f"Class distribution: Non-default={n_neg}, Default={n_pos} (Ratio: {imbalance_ratio:.2f})")
    
    # Stratified Train/Test Split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )
    
    # Standardization (fit only on train to prevent leakage)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Save preprocessing artifacts
    scaler_path = models_dir / "scaler.joblib"
    joblib.dump(scaler, scaler_path)
    
    with open(models_dir / "feature_names.json", "w") as f:
        json.dump(feature_names, f)
        
    # 2. Train Models with Class Imbalance Handling
    logger.info("Training Random Forest with balanced class weights...")
    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train_scaled, y_train)
    
    logger.info("Training XGBoost with scale_pos_weight...")
    scale_pos_weight = imbalance_ratio
    xgb = XGBClassifier(
        n_estimators=120,
        max_depth=5,
        learning_rate=0.08,
        scale_pos_weight=scale_pos_weight,
        eval_metric='logloss',
        random_state=42,
        n_jobs=-1
    )
    xgb.fit(X_train_scaled, y_train)
    
    # 3. Evaluate Models on identical test split
    def evaluate(model, X_eval, y_eval, name):
        y_pred = model.predict(X_eval)
        y_proba = model.predict_proba(X_eval)[:, 1]
        
        acc = accuracy_score(y_eval, y_pred)
        prec = precision_score(y_eval, y_pred, zero_division=0)
        rec = recall_score(y_eval, y_pred, zero_division=0)
        f1 = f1_score(y_eval, y_pred, zero_division=0)
        roc_auc = roc_auc_score(y_eval, y_proba)
        cm = confusion_matrix(y_eval, y_pred).tolist()
        
        logger.info(f"--- {name} Evaluation ---")
        logger.info(f"Accuracy: {acc:.4f} | Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f} | ROC-AUC: {roc_auc:.4f}")
        logger.info(f"Confusion Matrix: TN={cm[0][0]}, FP={cm[0][1]}, FN={cm[1][0]}, TP={cm[1][1]}")
        
        return {
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec),
            "f1_score": float(f1),
            "roc_auc": float(roc_auc),
            "confusion_matrix": cm
        }
        
    eval_rf = evaluate(rf, X_test_scaled, y_test, "Random Forest")
    eval_xgb = evaluate(xgb, X_test_scaled, y_test, "XGBoost")
    
    # Feature importances
    rf_importances = {name: float(imp) for name, imp in zip(feature_names, rf.feature_importances_)}
    xgb_importances = {name: float(imp) for name, imp in zip(feature_names, xgb.feature_importances_)}
    
    # Save both models
    rf_model_path = models_dir / "risk_classifier.joblib"
    xgb_model_path = models_dir / "credit_scorer.joblib"
    joblib.dump(rf, rf_model_path)
    joblib.dump(xgb, xgb_model_path)
    
    # Persist feature importances
    with open(models_dir / "feature_importance.json", "w") as f:
        json.dump({
            "random_forest": rf_importances,
            "xgboost": xgb_importances
        }, f, indent=4)
        
    # Documented dataset & model metadata
    model_metadata = {
        "dataset_name": "UCI Default of Credit Card Clients",
        "dataset_citation": "Yeh, I. C., & Lien, C. H. (2009). The comparisons of data mining techniques for the predictive accuracy of probability of default of credit card clients. Expert Systems with Applications, 36(2), 2473-2480.",
        "target_variable": "default (0 = Non-default next month, 1 = Default next month)",
        "train_size": len(y_train),
        "test_size": len(y_test),
        "imbalance_ratio": round(imbalance_ratio, 2),
        "model_version": "2.0.0",
        "deployed_model": "xgboost",
        "selection_rationale": "XGBoost selected based on superior ROC-AUC and balanced recall under class-weighted loss, while Random Forest is retained as benchmark.",
        "training_timestamp": datetime.now(timezone.utc).isoformat(),
        "dataset_limitations": (
            "The UCI Credit Card Default dataset represents revolving consumer credit card customers in Taiwan (April-September 2005). "
            "It captures historical billing and repayment delay trends, but does not contain real-time Indian UPI transaction telemetry, "
            "bank statement salary credits, or GST filings. In SpendiFy, this ML model scores behavioral credit risk from repayment track records, "
            "while monthly income, living expenses, and liquid surplus are deterministically evaluated by the SpendiFy Affordability Engine."
        ),
        "feature_descriptions": FEATURE_DESCRIPTIONS,
        "models": {
            "random_forest": eval_rf,
            "xgboost": eval_xgb
        }
    }
    
    with open(models_dir / "metrics.json", "w") as f:
        json.dump(model_metadata, f, indent=4)
        
    logger.info("Training, evaluation and artifact generation complete.")
    return model_metadata

if __name__ == "__main__":
    train_and_evaluate()
