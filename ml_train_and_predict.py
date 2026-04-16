import pandas as pd
import numpy as np
import json
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from imblearn.over_sampling import SMOTE

# Load data
csv_path = 'dataset/rba-small.csv'
data = pd.read_csv(csv_path)

# Normalize column names for easier access
cols = {c.lower().replace(' ', '_'): c for c in data.columns}

# Compute features per user
user_groups = data.groupby(cols['user_id'])
results = []
for user, group in user_groups:
    login_freq = len(group)
    failed_count = (group[cols['login_successful']] == False).sum() if group[cols['login_successful']].dtype == bool else (group[cols['login_successful']] == 0).sum()
    unique_ips = group[cols['ip_address']].nunique()
    avg_rtt = group[cols['round-trip_time_[ms]']].mean()
    is_attack_ip = int(group[cols['is_attack_ip']].astype(int).mode()[0])
    results.append({
        'user_id': user,
        'login_freq': login_freq,
        'failed_count': int(failed_count),
        'unique_ips': int(unique_ips),
        'avg_rtt': float(avg_rtt),
        'is_attack_ip': is_attack_ip
    })

# Convert to DataFrame for ML
features = ['failed_count', 'login_freq', 'unique_ips', 'avg_rtt']
df = pd.DataFrame(results)

# Fill NaN avg_rtt with the mean avg_rtt (per feature best practice)
if df['avg_rtt'].isnull().any():
    mean_rtt = df['avg_rtt'].mean()
    df['avg_rtt'] = df['avg_rtt'].fillna(mean_rtt)

# Force all features to numeric, coerce errors to NaN
for feat in features:
    df[feat] = pd.to_numeric(df[feat], errors='coerce')

# Print and inspect rows with NaN in features
print("Rows with NaN in features before drop:", df[features].isnull().any(axis=1).sum())
if df[features].isnull().any(axis=1).sum() > 0:
    print(df[df[features].isnull().any(axis=1)])

# Drop any rows with NaN in features
df = df.dropna(subset=features)

print("Rows with NaN in features after drop:", df[features].isnull().any(axis=1).sum())

print("Class distribution in full dataset:")
print(df['is_attack_ip'].value_counts())

# --- Train/test split and save datasets ---
train_df, test_df = train_test_split(df, test_size=0.3, random_state=42, stratify=df['is_attack_ip'])
train_df.to_csv('ml_train_dataset.csv', index=False)
test_df.to_csv('ml_test_dataset.csv', index=False)
print(f"Train and test datasets saved: {len(train_df)} train, {len(test_df)} test rows.")

print("Class distribution in train set:")
print(train_df['is_attack_ip'].value_counts())

X_train = train_df[features].values
y_train = train_df['is_attack_ip'].values
X_test = test_df[features].values
y_test = test_df['is_attack_ip'].values

# --- SMOTE oversampling on train set ---
print("Applying SMOTE oversampling to training data...")
sm = SMOTE(random_state=42)
X_train_res, y_train_res = sm.fit_resample(X_train, y_train)
print("Class distribution after SMOTE:")
print(pd.Series(y_train_res).value_counts())

# Train models with class_weight='balanced'
logreg = LogisticRegression(class_weight='balanced', max_iter=1000)
logreg.fit(X_train_res, y_train_res)
logreg_probs = logreg.predict_proba(X_test)[:, 1]
logreg_preds = (logreg_probs >= 0.5).astype(int)

rf = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
rf.fit(X_train_res, y_train_res)
rf_probs = rf.predict_proba(X_test)[:, 1]
rf_preds = (rf_probs >= 0.5).astype(int)

# Evaluate and print metrics
print("Logistic Regression Test Metrics:")
print("Accuracy:", accuracy_score(y_test, logreg_preds))
print("Precision:", precision_score(y_test, logreg_preds, zero_division=0))
print("Recall:", recall_score(y_test, logreg_preds, zero_division=0))
print("F1:", f1_score(y_test, logreg_preds, zero_division=0))

print("Random Forest Test Metrics:")
print("Accuracy:", accuracy_score(y_test, rf_preds))
print("Precision:", precision_score(y_test, rf_preds, zero_division=0))
print("Recall:", recall_score(y_test, rf_preds, zero_division=0))
print("F1:", f1_score(y_test, rf_preds, zero_division=0))


# Save results for test set
ml_results = []
for i, (_, row) in enumerate(test_df.iterrows()):
    ml_results.append({
        'user_id': row['user_id'],
        'failed_count': int(row['failed_count']),
        'login_freq': int(row['login_freq']),
        'unique_ips': int(row['unique_ips']),
        'avg_rtt': float(row['avg_rtt']),
        'logreg_prob': float(logreg_probs[i]),
        'logreg_pred': int(logreg_preds[i]),
        'rf_prob': float(rf_probs[i]),
        'rf_pred': int(rf_preds[i]),
        'is_attack_ip': int(row['is_attack_ip'])
    })

# Save overall metrics for easy frontend integration

# Use keys matching frontend expectations
metrics_summary = {
    'LogReg (Raw)': {
        'accuracy': accuracy_score(y_test, logreg_preds),
        'precision': precision_score(y_test, logreg_preds, zero_division=0),
        'recall': recall_score(y_test, logreg_preds, zero_division=0),
        'f1': f1_score(y_test, logreg_preds, zero_division=0)
    },
    'RF (Raw)': {
        'accuracy': accuracy_score(y_test, rf_preds),
        'precision': precision_score(y_test, rf_preds, zero_division=0),
        'recall': recall_score(y_test, rf_preds, zero_division=0),
        'f1': f1_score(y_test, rf_preds, zero_division=0)
    }
}

with open('ml_results.json', 'w') as f:
    json.dump({'results': ml_results, 'metrics': metrics_summary}, f, indent=2)

print('ML results and metrics saved to ml_results.json')