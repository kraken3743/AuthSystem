import pandas as pd
import numpy as np
import json
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold
import matplotlib.pyplot as plt
from xgboost import XGBClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import classification_report, confusion_matrix, precision_recall_curve

# Load features and base model predictions from ml_results.json
with open('ml_results.json', 'r') as f:
    ml_results = json.load(f)

df = pd.DataFrame(ml_results['results'])

# --- Feature engineering: compute real features ---
# failed_success_ratio = failed_count / max(success_count, 1)
df['success_count'] = df.get('success_count', pd.Series([df['login_freq'][i] - df['failed_count'][i] if 'login_freq' in df and 'failed_count' in df else 0 for i in range(len(df))]))
df['failed_success_ratio'] = df['failed_count'] / df['success_count'].replace(0, 1)

# unusual_login_hour = 1 if login_hour < 6 or login_hour > 22 else 0
if 'login_hour' in df.columns:
    df['unusual_login_hour'] = df['login_hour'].apply(lambda h: 1 if h < 6 or h > 22 else 0)
else:
    df['unusual_login_hour'] = 0

# is_new_ip = 1 if current_ip not in previous_ips else 0
if 'current_ip' in df.columns and 'previous_ips' in df.columns:
    df['is_new_ip'] = [1 if ip not in prev else 0 for ip, prev in zip(df['current_ip'], df['previous_ips'])]
else:
    df['is_new_ip'] = 0

# is_new_device = 1 if current_device not in previous_devices else 0
if 'current_device' in df.columns and 'previous_devices' in df.columns:
    df['is_new_device'] = [1 if dev not in prev else 0 for dev, prev in zip(df['current_device'], df['previous_devices'])]
else:
    df['is_new_device'] = 0

# consecutive_failed_attempts: count max consecutive failed logins per user
def compute_consecutive_failed_attempts(df):
    if 'user_id' not in df.columns or 'failed_count' not in df.columns:
        return pd.Series([0]*len(df))
    result = []
    for uid in df['user_id'].unique():
        user_df = df[df['user_id'] == uid]
        fails = user_df['failed_count'].values
        max_consec = 0
        curr = 0
        for f in fails:
            if f > 0:
                curr += 1
                max_consec = max(max_consec, curr)
            else:
                curr = 0
        result.extend([max_consec]*len(user_df))
    return pd.Series(result, index=df.index)
df['consecutive_failed_attempts'] = compute_consecutive_failed_attempts(df)

# recent_failed_5m, recent_failed_30m, recent_failed_24h: count failed logins in last X minutes/hours per user
for window, col in zip([5, 30, 24*60], ['recent_failed_5m', 'recent_failed_30m', 'recent_failed_24h']):
    if 'login_time' in df.columns and 'user_id' in df.columns and 'failed_count' in df.columns:
        df[col] = 0
        df['login_time'] = pd.to_datetime(df['login_time'])
        for uid in df['user_id'].unique():
            user_df = df[df['user_id'] == uid].sort_values('login_time')
            times = user_df['login_time'].values
            idxs = user_df.index.values
            for i, idx in enumerate(idxs):
                t = times[i]
                window_start = t - np.timedelta64(window, 'm')
                mask = (user_df['login_time'] >= window_start) & (user_df['login_time'] <= t)
                df.at[idx, col] = user_df.loc[mask, 'failed_count'].sum()
    else:
        df[col] = 0

# avg_failed_gap: average time (in minutes) between failed attempts per user
def compute_avg_failed_gap(df):
    if 'user_id' not in df.columns or 'login_time' not in df.columns or 'failed_count' not in df.columns:
        return pd.Series([0]*len(df))
    df['login_time'] = pd.to_datetime(df['login_time'])
    result = []
    for uid in df['user_id'].unique():
        user_df = df[(df['user_id'] == uid) & (df['failed_count'] > 0)].sort_values('login_time')
        times = user_df['login_time'].values
        if len(times) < 2:
            avg_gap = 0
        else:
            gaps = [(times[i] - times[i-1]).astype('timedelta64[m]').astype(int) for i in range(1, len(times))]
            avg_gap = np.mean(gaps) if gaps else 0
        result.extend([avg_gap]*len(user_df))
    # Fill for all rows
    avg_gap_full = [0]*len(df)
    for i, idx in enumerate(df.index):
        if df['failed_count'][idx] > 0:
            avg_gap_full[idx] = result.pop(0)
    return pd.Series(avg_gap_full, index=df.index)
df['avg_failed_gap'] = compute_avg_failed_gap(df)

# unique_devices: count unique devices per user
if 'device_id' in df.columns and 'user_id' in df.columns:
    df['unique_devices'] = df.groupby('user_id')['device_id'].transform('nunique')
else:
    df['unique_devices'] = 0
from sklearn.model_selection import train_test_split

meta_features = [
    'logreg_prob', 'rf_prob',
    'failed_count', 'login_freq', 'unique_ips', 'avg_rtt',
    'success_count', 'failed_success_ratio', 'unusual_login_hour',
    'is_new_ip', 'is_new_device', 'consecutive_failed_attempts',
    'recent_failed_5m', 'recent_failed_30m', 'recent_failed_24h',
    'avg_failed_gap', 'unique_devices'
]

X = df[meta_features].values
y = df['is_attack_ip'].values

# Split and save datasets
X_train, X_test, y_train, y_test, indices_train, indices_test = train_test_split(
    X, y, df.index, test_size=0.3, random_state=42, stratify=y
)

meta_train_dataset = df.loc[indices_train]
meta_test_dataset = df.loc[indices_test]

meta_train_dataset.to_csv('meta_train_dataset.csv', index=False)
meta_test_dataset.to_csv('meta_test_dataset.csv', index=False)
print(f"Meta train and test datasets saved: {len(meta_train_dataset)} train, {len(meta_test_dataset)} test rows.")

# Calculate scale_pos_weight
pos_count = sum(y_train)
neg_count = len(y_train) - pos_count
spw = neg_count / pos_count if pos_count > 0 else 1

# Train Meta-Model
xgb = XGBClassifier(
    n_estimators=100,
    max_depth=4,
    learning_rate=0.05,
    random_state=42,
    scale_pos_weight=spw
)

calibrated_xgb = CalibratedClassifierCV(xgb, method='sigmoid', cv=5)
calibrated_xgb.fit(X_train, y_train)

# Output predictions to all df points to maintain previous output format
meta_probs = calibrated_xgb.predict_proba(X)[:, 1]
meta_preds = (meta_probs >= 0.5).astype(int)

df['meta_prob'] = meta_probs
df['meta_pred'] = meta_preds

print("Meta-Model Test Metrics (on test fold only):")
test_probs = calibrated_xgb.predict_proba(X_test)[:, 1]
test_preds = (test_probs >= 0.5).astype(int)
print(classification_report(y_test, test_preds))

# Save results
with open('ml_results_with_meta.json', 'w') as f:
    json.dump(df.to_dict(orient='records'), f, indent=2)

print('Stacking meta-model results saved to ml_results_with_meta.json')
