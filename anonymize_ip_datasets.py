import csv
import hmac
import hashlib
import os

# List of dataset files to anonymize (add more if needed)
DATASETS = [
    'dataset/linux_auth_logs_formatted.csv',
    'dataset/rba-small.csv',
    'dataset/rba-small-import.csv',
]

# Output file suffix
OUTPUT_SUFFIX = '_anonymized.csv'

# Column name for IP address
IP_COLUMN = 'ip_address'

# Generate a random 32-byte key for HMAC
SECRET_KEY = os.urandom(32)


def pseudonymize_ip(ip, key):
    """Return a consistent pseudonym for an IP address using HMAC-SHA256."""
    return hmac.new(key, ip.encode(), hashlib.sha256).hexdigest()


def anonymize_file(input_path, output_path, key):
    with open(input_path, 'r', newline='') as infile, open(output_path, 'w', newline='') as outfile:
        reader = csv.DictReader(infile)
        fieldnames = reader.fieldnames
        if IP_COLUMN not in fieldnames:
            print(f"Skipping {input_path}: no '{IP_COLUMN}' column.")
            return
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        for row in reader:
            row[IP_COLUMN] = pseudonymize_ip(row[IP_COLUMN], key)
            writer.writerow(row)
    print(f"Anonymized file written to {output_path}")


def main():
    for dataset in DATASETS:
        if not os.path.exists(dataset):
            print(f"File not found: {dataset}")
            continue
        output_path = dataset.replace('.csv', OUTPUT_SUFFIX)
        anonymize_file(dataset, output_path, SECRET_KEY)
    print("All done. New anonymized files created.")


if __name__ == '__main__':
    main()
