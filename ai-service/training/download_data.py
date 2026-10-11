import urllib.request
import os
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

URL = "https://archive.ics.uci.edu/ml/machine-learning-databases/00350/default%20of%20credit%20card%20clients.xls"

def download_dataset():
    data_dir = Path(__file__).resolve().parent.parent.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = data_dir / "default_of_credit_card_clients.xls"
    if file_path.exists():
        logger.info(f"Dataset already exists at {file_path}")
        return file_path
        
    logger.info(f"Downloading dataset from {URL}...")
    try:
        urllib.request.urlretrieve(URL, file_path)
        logger.info(f"Successfully downloaded to {file_path}")
        return file_path
    except Exception as e:
        logger.error(f"Failed to download dataset: {e}")
        raise

if __name__ == "__main__":
    download_dataset()
