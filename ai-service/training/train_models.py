import os
import json
from pathlib import Path
import logging
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, classification_report
import joblib

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def train_and_evaluate():
    data_path = Path(__file__).resolve().parent.parent.parent / "data" / "default_of_credit_card_clients.xls"
    models_dir = Path(__file__).resolve().parent.parent / "trained_models"
    models_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"Loading dataset from {data_path}...")
    df = pd.read_excel(data_path, header=1)
    
    # 1. Validation and cleaning
    logger.info("Preprocessing data...")
    # Drop ID column
    if 'ID' in df.columns:
        df = df.drop(columns=['ID'])
        
    # Rename target column for ease of use
    df = df.rename(columns={'default payment next month': 'default'})
    
    # Separate features and target
    X = df.drop(columns=['default'])
    y = df['default']
    
    feature_names = X.columns.tolist()
    logger.info(f"Features ({len(feature_names)}): {feature_names}")
    
    # Stratified Train/Test Split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    
    # Preprocessing (Standardization)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Save preprocessing artifacts
    scaler_path = models_dir / "scaler.joblib"
    joblib.dump(scaler, scaler_path)
    
    # Also save feature names
    with open(models_dir / "feature_names.json", "w") as f:
        json.dump(feature_names, f)
        
    # 2. Train Models
    logger.info("Training Random Forest...")
    rf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    rf.fit(X_train_scaled, y_train)
    
    logger.info("Training XGBoost...")
    xgb = XGBClassifier(use_label_encoder=False, eval_metric='logloss', max_depth=6, random_state=42, n_jobs=-1)
    xgb.fit(X_train_scaled, y_train)
    
    # 3. Evaluate Models
    def evaluate(model, X_test, y_test, name):
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)[:, 1]
        
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred)
        rec = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        roc_auc = roc_auc_score(y_test, y_proba)
        cm = confusion_matrix(y_test, y_pred).tolist()
        
        logger.info(f"--- {name} ---")
        logger.info(f"Accuracy: {acc:.4f} | Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f} | ROC-AUC: {roc_auc:.4f}")
        
        return {
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec),
            "f1_score": float(f1),
            "roc_auc": float(roc_auc),
            "confusion_matrix": cm
        }
        
    metrics = {
        "dataset_name": "UCI Default of Credit Card Clients",
        "test_size": len(y_test),
        "train_size": len(y_train),
        "models": {
            "random_forest": evaluate(rf, X_test_scaled, y_test, "Random Forest"),
            "xgboost": evaluate(xgb, X_test_scaled, y_test, "XGBoost")
        }
    }
    
    # We will select XGBoost as our primary model for deployment
    primary_model_path = models_dir / "credit_scorer.joblib"
    joblib.dump(xgb, primary_model_path)
    
    metrics["deployed_model"] = "xgboost"
    metrics["model_version"] = "1.0.0"
    
    # Save evaluation report
    with open(models_dir / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=4)
        
    logger.info("Training complete. Artifacts saved.")

if __name__ == "__main__":
    train_and_evaluate()
