import pandas as pd
import numpy as np

# Load the linux dataset
df = pd.read_csv('dataset/linux_auth_logs_full(balanced).csv')

# Map columns to match rba-small.csv
# linux columns: 'timestamp', 'source_ip', 'server', 'username', 'service', 'attempts', 'status', 'port', 'protocol', 'comment', 'anomaly_label', 'delta_t'
# target columns: 'user_id', 'ip_address', 'login_successful', 'round-trip_time_[ms]', 'is_attack_ip'

target_df = pd.DataFrame()
target_df['user_id'] = df['username']
target_df['ip_address'] = df['source_ip']
target_df['login_successful'] = df['status'].apply(lambda x: True if x == 'success' else False) # Assuming 'success' is the string
# Simulate RTT using delta_t if available, else random between 10 and 200
target_df['round-trip_time_[ms]'] = df['delta_t'].fillna(pd.Series(np.random.uniform(10, 200, size=len(df)))) * 100
target_df['is_attack_ip'] = df['anomaly_label'].apply(lambda x: 1 if x != 'normal' else 0)

target_df.to_csv('dataset/linux_auth_logs_formatted.csv', index=False)
print("Saved formatted dataset to dataset/linux_auth_logs_formatted.csv")
