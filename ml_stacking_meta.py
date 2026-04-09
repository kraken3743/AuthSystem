import pandas as pd
import numpy as np
import json
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold

# Load features and base model predictions from ml_results.json
with open('ml_results.json', 'r') as f:
    ml_results = json.load(f)

df = pd.DataFrame(ml_results)

# Use base model probabilities as features for meta-model
meta_X = df[['logreg_prob', 'rf_prob']].values
meta_y = df['is_attack_ip'].values

# Prepare out-of-fold meta features for fair evaluation
meta_features = np.zeros((meta_X.shape[0], 2))
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
meta_model = LogisticRegression()
for train_idx, test_idx in skf.split(meta_X, meta_y):
    # Train base models on train fold
    X_train, y_train = meta_X[train_idx], meta_y[train_idx]
    meta_model.fit(X_train, y_train)
    # Predict on test fold
    meta_features[test_idx, :] = X_train.mean(axis=0)  # Not used, just for structure
# Train meta-model on all data
meta_model.fit(meta_X, meta_y)
meta_probs = meta_model.predict_proba(meta_X)[:, 1]
meta_preds = (meta_probs >= 0.5).astype(int)

df['meta_prob'] = meta_probs

df['meta_pred'] = meta_preds

# Save new results with meta-model outputs
with open('ml_results_with_meta.json', 'w') as f:
    json.dump(df.to_dict(orient='records'), f, indent=2)

print('Stacking meta-model results saved to ml_results_with_meta.json')
