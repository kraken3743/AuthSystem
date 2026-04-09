import pandas as pd
import numpy as np
import json
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier

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

X = df[features].values
y = df['is_attack_ip'].values

# Train models
logreg = LogisticRegression()
logreg.fit(X, y)
logreg_probs = logreg.predict_proba(X)[:, 1]
logreg_preds = (logreg_probs >= 0.5).astype(int)

rf = RandomForestClassifier(n_estimators=10, random_state=42)
rf.fit(X, y)
rf_probs = rf.predict_proba(X)[:, 1]
rf_preds = (rf_probs >= 0.5).astype(int)

# Save results
ml_results = []
for i, row in df.iterrows():
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

with open('ml_results.json', 'w') as f:
    json.dump(ml_results, f, indent=2)

print('ML results saved to ml_results.json')