"""
SpendiFy AI Service - Offline Customer Model Trainer.

Trains XGBoost and Random Forest ML models on offline customer datasets or
database records. Generates model artifacts (.joblib, .json) into
ai-service/trained_models/ for instant deployment into the SpendiFy AI service.
"""

import argparse
import json
import logging
import os
from pathlib import Path
import sqlite3
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score, accuracy_score
from sklearn.model_selection import train_test_split
import xgboost as xgb

# Add parent directory to path so app modules can be imported
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.services.feature_engineer import FeatureEngineer

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("TrainModels")

MODEL_DIR = Path(__file__).resolve().parent.parent / "trained_models"


def load_dataset_from_csv(csv_path: Path) -> pd.DataFrame:
    """Load offline customer dataset from CSV file."""
    logger.info("Loading offline dataset from CSV: %s", csv_path)
    if not csv_path.exists():
        raise FileNotFoundError(f"Dataset CSV not found at: {csv_path}")
    df = pd.read_csv(csv_path)
    logger.info("Loaded %d rows and %d columns from CSV.", len(df), len(df.columns))
    return df


def load_dataset_from_sqlite(db_path: Path) -> pd.DataFrame:
    """Load customer dataset from SQLite database."""
    logger.info("Loading customer dataset from SQLite database: %s", db_path)
    if not db_path.exists():
        raise FileNotFoundError(f"Database file not found at: {db_path}")

    conn = sqlite3.connect(db_path)
    query = """
    SELECT u.id, u.name, u.email,
           p.creditScore, p.defaultProbability, p.riskCategory, p.shapExplanation,
           l.amount as requested_loan_amount, l.tenureMonths as requested_tenure_months, l.status as loanStatus
    FROM User u
    JOIN Loan l ON u.id = l.userId
    JOIN AIPrediction p ON l.id = p.loanId
    """
    df = pd.read_sql_query(query, conn)
    conn.close()

    logger.info("Loaded %d customer prediction records from DB.", len(df))
    return df


def extract_features_and_targets(df: pd.DataFrame):
    """Extract 20 engineered features and target labels from DataFrame."""
    feature_engineer = FeatureEngineer()
    X_list = []
    y_default_list = []
    y_risk_list = []

    for idx, row in df.iterrows():
        # Parse or extract financial summary dictionary
        financial_summary = {
            "annual_income": float(row.get("annual_income", row.get("monthly_income", 50000) * 12.0)),
            "monthly_income": float(row.get("monthly_income", 50000)),
            "monthly_expenses": float(row.get("monthly_expenses", 20000)),
            "savings": float(row.get("savings_balance", 100000)),
            "total_debt": float(row.get("total_debt", 50000)),
            "credit_utilization": float(row.get("credit_utilization", 0.25)),
            "num_credit_accounts": float(row.get("num_credit_cards", 2)),
            "num_loans": float(row.get("num_active_loans", 1)),
            "payment_history_pct": float(row.get("payment_history_score", 0.95)),
            "credit_history_length_months": float(row.get("years_of_credit_history", 5) * 12.0),
            "recent_inquiries": float(row.get("num_hard_inquiries", 1)),
            "bankruptcies": float(row.get("bankruptcies", 0)),
            "tax_liens": float(row.get("tax_liens", 0)),
        }

        additional_data = {
            "age": float(row.get("age", 32)),
            "employment_length_months": float(row.get("employment_length_months", 36)),
            "dependents": float(row.get("dependents", 1)),
        }

        # Generate feature vector
        features = feature_engineer.generate_features(financial_summary, additional_data)
        X_list.append(features)

        # Targets
        is_default = int(row.get("is_default", 1 if row.get("loanStatus") == "DEFAULTED" else 0))
        risk_cat = str(row.get("risk_category", "HIGH" if is_default else "LOW")).upper()

        y_default_list.append(is_default)
        y_risk_list.append(risk_cat)

    X = np.array(X_list)
    y_default = np.array(y_default_list)
    y_risk = np.array(y_risk_list)

    return X, y_default, y_risk


def train_and_save_models(csv_path: Path, db_path: Path):
    """Main model training pipeline."""
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Load data
    if csv_path and csv_path.exists():
        df = load_dataset_from_csv(csv_path)
    elif db_path and db_path.exists():
        df = load_dataset_from_sqlite(db_path)
    else:
        # Fallback to default csv path
        default_csv = Path(__file__).resolve().parent.parent.parent / "data" / "sample_offline_customers.csv"
        df = load_dataset_from_csv(default_csv)

    # 2. Engineer features
    X, y_default, y_risk = extract_features_and_targets(df)
    feature_names = FeatureEngineer.FEATURE_NAMES

    logger.info("Dataset shape: X=%s, y_default=%s, y_risk=%s", X.shape, y_default.shape, y_risk.shape)

    # 3. Train XGBoost Credit Default Scorer
    logger.info("--- Training XGBoost Credit Scorer ---")
    xgb_model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        eval_metric="logloss",
    )
    xgb_model.fit(X, y_default)

    train_acc = accuracy_score(y_default, xgb_model.predict(X))
    logger.info("XGBoost Training Accuracy: %.4f", train_acc)

    # Save XGBoost Scorer model artifact (.joblib)
    credit_scorer_path = MODEL_DIR / "credit_scorer.joblib"
    joblib.dump(xgb_model, credit_scorer_path)
    logger.info("Saved credit scorer model to: %s", credit_scorer_path)

    # Save raw XGBoost JSON model for SHAP TreeExplainer
    credit_model_json_path = MODEL_DIR / "credit_model.json"
    xgb_model.get_booster().save_model(str(credit_model_json_path))
    logger.info("Saved XGBoost JSON model for SHAP to: %s", credit_model_json_path)

    # 4. Train Random Forest Risk Classifier
    logger.info("--- Training Random Forest Risk Classifier ---")
    rf_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=5,
        random_state=42,
        class_weight="balanced" if len(set(y_risk)) > 1 else None,
    )
    rf_model.fit(X, y_risk)

    rf_acc = accuracy_score(y_risk, rf_model.predict(X))
    logger.info("Random Forest Training Accuracy: %.4f", rf_acc)

    risk_classifier_path = MODEL_DIR / "risk_classifier.joblib"
    joblib.dump(rf_model, risk_classifier_path)
    logger.info("Saved risk classifier model to: %s", risk_classifier_path)

    # 5. Save Feature Names Metadata
    feature_names_path = MODEL_DIR / "feature_names.json"
    with open(feature_names_path, "w", encoding="utf-8") as f:
        json.dump(feature_names, f, indent=2)
    logger.info("Saved feature names metadata to: %s", feature_names_path)

    print("\n=======================================================")
    print("SUCCESS: ML Model Training & Artifact Generation Complete!")
    print(f"Output Artifacts Directory: {MODEL_DIR}")
    print("  - credit_scorer.joblib")
    print("  - credit_model.json")
    print("  - risk_classifier.joblib")
    print("  - feature_names.json")
    print("=======================================================\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train SpendiFy AI Models on Offline Customer Data")
    parser.add_argument("--csv", type=str, help="Path to offline customer CSV file")
    parser.add_argument("--db", type=str, help="Path to SQLite database file")

    args = parser.parse_args()

    csv_p = Path(args.csv) if args.csv else Path(__file__).resolve().parent.parent.parent / "data" / "sample_offline_customers.csv"
    db_p = Path(args.db) if args.db else Path(__file__).resolve().parent.parent.parent / "server" / "prisma" / "dev.db"

    train_and_save_models(csv_p, db_p)
