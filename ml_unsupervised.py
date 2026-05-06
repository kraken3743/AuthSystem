import pandas as pd
import numpy as np
import json
import requests
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# Load features and meta model predictions from ml_results_with_meta.json
with open('ml_results_with_meta.json', 'r') as f:
    raw_results = json.load(f)

df = pd.DataFrame(raw_results)

# Features array (Expanded for higher accuracy unsupervised isolation)
meta_features = [
    'logreg_prob', 'rf_prob', 'failed_count', 'login_freq', 'unique_ips', 'avg_rtt'
]

X = df[meta_features].values
y = df['is_attack_ip'].values

# Split and save datasets for user transparency
X_train, X_test, y_train, y_test, indices_train, indices_test = train_test_split(
    X, y, df.index, test_size=0.3, random_state=42, stratify=y
)

unsup_train_dataset = df.loc[indices_train]
unsup_test_dataset = df.loc[indices_test]

unsup_train_dataset.to_csv('unsupervised_train_dataset.csv', index=False)
unsup_test_dataset.to_csv('unsupervised_test_dataset.csv', index=False)
print(f"Unsupervised train and test datasets saved: {len(unsup_train_dataset)} train, {len(unsup_test_dataset)} test rows.")

# --- Isolation Forest ---
# Fixed contamination for stable, high-accuracy boundaries
iso_contamination = 0.05

iso = IsolationForest(
    n_estimators=150,
    max_samples='auto',
    contamination=iso_contamination,
    random_state=42
)

iso.fit(X_train)
iso_raw_preds = iso.predict(X)
# IF returns -1 for outliers (attacks) and 1 for inliers (normal). Map to 1 and 0.
iso_all_preds = (iso_raw_preds == -1).astype(int)


# --- Local Outlier Factor ---
# Fixed contamination similarly for LOF
lof_contamination = 0.05

lof = LocalOutlierFactor(
    n_neighbors=20,
    contamination=lof_contamination,
    novelty=True # novelty=True is required to predict on full X after fitting on X_train
)

lof.fit(X_train)
lof_raw_preds = lof.predict(X)
# LOF also returns -1 for outliers and 1 for inliers
lof_all_preds = (lof_raw_preds == -1).astype(int)

df['iso_pred'] = iso_all_preds
df['lof_pred'] = lof_all_preds

# Print metrics metrics
print("\n--- Isolation Forest Test Metrics (Overall Data) ---")
print(classification_report(y, iso_all_preds))

print("\n--- Local Outlier Factor Test Metrics (Overall Data) ---")
print(classification_report(y, lof_all_preds))

# Save results locally
with open('ml_results_unsupervised.json', 'w') as f:
    json.dump(df.to_dict(orient='records'), f, indent=2)

print('Unsupervised results saved to ml_results_unsupervised.json')

# Convert format and POST to backend
results = []
for index, row in df.iterrows():
    results.append({
        "userId": str(row.get("user_id", "")),
        "isoPred": int(row.get("iso_pred", 0)),
        "lofPred": int(row.get("lof_pred", 0)),
        "isAttackIp": int(row.get("is_attack_ip", 0))
    })

url = 'http://localhost:8081/auth/analytics/unsupervised-model/results'

try:
    resp = requests.post(url, json=results)
    print('\nUploading Results to DB:')
    print('Status code:', resp.status_code)
except Exception as e:
    print('Failed to upload results. Is the Spring Boot backend running?', e)
