import json
import requests

# Load meta-model results
with open('ml_results_with_meta.json', 'r') as f:
    raw_results = json.load(f)

# Convert snake_case to camelCase for Java backend
def to_camel_case(d):
    return {
        "userId": str(d.get("user_id")),
        "failedCount": d.get("failed_count"),
        "loginFreq": d.get("login_freq"),
        "uniqueIps": d.get("unique_ips"),
        "avgRtt": d.get("avg_rtt"),
        "metaProb": d.get("meta_prob"),
        "metaPred": d.get("meta_pred"),
        "isAttackIp": d.get("is_attack_ip"),
    }

results = [to_camel_case(item) for item in raw_results]

# API endpoint
url = 'http://localhost:8081/auth/analytics/meta-model/results'

# POST the results
resp = requests.post(url, json=results)

print('Status code:', resp.status_code)
try:
    print('Response:', resp.json())
except Exception:
    print('Response:', resp.text)