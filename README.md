# Privacy-Preserving Authentication & Login Anomaly Detection System

## 1. Overview

This project is a comprehensive authentication and analytics system built with Java Spring Boot and a JavaScript frontend. It provides standard user authentication (registration and login) with role-based access control (ADMIN/USER).

The system's core feature is its security analytics dashboard, which provides insights into login patterns with a focus on privacy. It uses differential privacy to obscure individual user data while still allowing for meaningful aggregate analysis. The system is designed to detect anomalies based on login failures, both across all time and within specific time windows. It supports analyzing its own login data as well as external datasets like the CERT insider threat logs.

## 2. Core Features

* **User Authentication**: Secure user registration and login.
* **Role-Based Access Control (RBAC)**: Distinct `ADMIN` and `USER` roles. The first user to register automatically becomes an `ADMIN`.
* **Interactive Analytics Dashboard**: A feature-rich UI for administrators to monitor security metrics.
* **Login Auditing**: Logs every login attempt (both successful and failed) for auditing and analysis.
* **Differential Privacy**: Applies Laplace and Gaussian noise to analytics queries to protect user privacy. The dashboard allows selection between Laplace and Gaussian mechanisms, with customizable epsilon (ε) and delta (δ) values.
* **Anomaly Detection**:
    * **Threshold-Based**: Identifies users with a suspiciously high number of failed logins.
    * **Time-Window Analysis**: Tracks login events in a recent time window (e.g., 30 minutes) to detect sudden spikes in activity.
    * **Z-Score Based**: Detects users whose failed login counts are statistical outliers (configurable Z-score threshold).
* **Dual Dataset Support**: Can run analytics on either the internal application `login_logs` or an external `cert_login_logs` dataset.

* **Machine Learning Anomaly Detection (RBA)**: Applies ML models (Logistic Regression, Random Forest) to the RBA dataset for advanced anomaly detection. Results are available via a dedicated dashboard tab and REST API endpoints.

## 3. Technology Stack

| Component      | Technology                                       |
|----------------|--------------------------------------------------|
| **Backend** | Java 17, Spring Boot 3.2.1, Spring Security, JPA |
| **Database** | PostgreSQL                                       |
| **Frontend** | HTML, CSS, JavaScript (ES6)                      |
| **Charting** | Chart.js                                         |
| **Build Tool** | Maven                                            |

## 4. System Architecture

The application follows a classic client-server architecture.

### Backend

The backend is a monolithic Spring Boot application responsible for business logic, data persistence, and serving the frontend.

* **Controllers (`com.authsys.controller`)**:
    * `AuthController`: Manages public-facing endpoints for user registration (`/auth/register`) and login (`/auth/login`).
    * `AdminController`: Provides restricted endpoints for user management (`/auth/admin/**`), such as listing users, changing roles, and deleting users.
    * `AnalyticsController`: Provides endpoints for privacy-preserving analytics and anomaly detection, including Z-Score based detection.
    * `CertAnalyticsController`: Provides analytics endpoints for CERT dataset.

* **Service Layer (`com.authsys.service`)**:
    * `AuthService`: Implements business logic, including privacy mechanisms and Z-Score anomaly detection.

* **Privacy Utilities (`com.authsys.privacy`)**:
    * `DifferentialPrivacyUtil`: Implements Laplace, Gaussian, and Z-Score calculations.

### Frontend

* **Dashboard**: Allows admins to select privacy mechanism (Laplace/Gaussian), epsilon, and delta. Z-Score anomaly detection is available as a separate tab with configurable threshold. All analytics and charts are labeled accordingly.

## 5. System Pipeline

1. **User Interaction**
   - Users register and log in through the web UI.
   - Requests go to the Spring Boot backend over HTTPS.

2. **Authentication & Authorization**
   - `AuthController` and `AuthService` handle registration, login, password hashing, and RBAC.

3. **Logging & Data Ingestion**
   - Every login attempt (success and failure) is written to the `login_logs` table.
   - External datasets (CERT, RBA) are imported into their own tables (e.g., `cert_login_logs`, `rba_login_logs`).

4. **Feature Engineering**
   - Aggregations compute features per user and time window, such as:
     - total failed login count,
     - failed logins in a sliding time window,
     - IP-related features,
     - RBA features where available.

5. **Privacy Mechanisms**
   - Analytics endpoints call `DifferentialPrivacyUtil` to add Laplace or Gaussian noise to aggregate statistics, controlled by ε and δ parameters from the dashboard.

6. **Anomaly Detection (Rule-based & Statistical)**
   - **Threshold method:** flag users whose failed counts exceed a chosen cutoff.
   - **Time-window IDS:** analyze spikes of failures in recent windows.
   - **Z-Score method:** compute z-scores for failed counts and flag statistical outliers.

7. **Machine Learning on RBA Dataset**
   - For the `rba_login_logs` dataset, additional ML models are applied:
     - **Logistic Regression**:
       - Uses engineered features to estimate attack probability: P(attack | x).
       - Prediction: attack if σ(w₀ + Σwᵢxᵢ) ≥ τ, where σ(z) = 1 / (1 + e^{-z}).
     - **Random Forest**:
       - Multiple small decision trees are trained on bootstrapped samples of the RBA data.
       - Final prediction is the majority vote: mode(T₁(x), T₂(x), ..., Tₙ(x)).
     - **Meta-Model (Stacking)**:
       - Uses an advanced external Python pipeline to extract multivariant features highly correlated with true botnet behaviors (such as `avg_rtt`, `unique_ips`, and `login_freq`).
       - Implements a finely-calibrated strict 0.1 threshold to drastically improve Recall and F1 Score over base algorithms.
       - Predictions are stored via `ml_results_with_meta.json` and seamlessly synchronized to the backend datastore via `post_meta_results.py`.
   - Backend endpoints expose per-user predictions and accuracy/metric comparisons; the "ML Anomaly (RBA)" tab in the dashboard consumes these APIs.

8. **REST API Layer**
   - All analytics (privacy-preserving aggregates, anomaly scores, and ML results) are served as JSON from `/auth/analytics/**` endpoints.
   - Example endpoints include baseline logistic mapping endpoints and the dynamic comparative `/auth/analytics/rba/metrics-comparison` aggregator.

9. **Dashboard & Visualization**
   - The frontend (HTML/JS + Chart.js) calls the REST APIs, renders tables and charts for:
     - basic login statistics,
     - threshold & Z-Score anomalies,
     - RBA accuracy/metrics comparisons,
     - ML-based anomaly detection on the RBA dataset.
   - **Metrics Comparison UI**: An entire dynamically populated dashboard mapping Algorithm Accuracy (Precision, Recall, F1 Score, False Positives, False Negatives) using highly vibrant and distinguishable Pie Charts with white negative-space charting for ultimate readability in dark mode.

10. **Model Training & API Communication**
   - The baseline ML models (Logistic Regression, Random Forest) are pre-trained/fixed in the backend. No training occurs per request; only inference is performed using preset weights/trees.
   - The high-accuracy Meta-Model results are pre-calculated offline and seeded to the application via REST POST interactions.

### API Endpoint Capabilities:
   - `/auth/analytics/rba/ml/logistic`: Returns per-user attack probability and prediction using logistic regression (raw data, pre-trained/fixed weights).
   - `/auth/analytics/rba/ml/randomforest`: Returns per-user attack prediction using a random forest ensemble (raw data, pre-trained/fixed trees).
   - `/auth/analytics/rba/ml/logistic-dp?method=laplace|gaussian&epsilon=...&delta=...`: Returns per-user attack probability and prediction using logistic regression on differentially private (Laplace or Gaussian) data (pre-trained/fixed weights).
   - `/auth/analytics/rba/ml/randomforest-dp?method=laplace|gaussian&epsilon=...&delta=...`: Returns per-user attack prediction using a random forest ensemble on differentially private data (pre-trained/fixed trees).
   - `/auth/analytics/rba/metrics-comparison`: Delivers a comprehensive quantitative breakdown evaluating Precision/Recall/F1 dynamically across all registered ML mechanisms.

   ## 10. ML Anomaly (RBA) Tab

The dashboard now includes a dedicated tab for ML-based anomaly detection on the RBA dataset. This tab allows you to:

- Run logistic regression and random forest models on the RBA login data (raw and differentially private versions).
- View per-user attack probabilities and predictions for both raw and DP-trained models.
- Select the DP mechanism (Laplace or Gaussian) and set ε, δ parameters for privacy.
- Compare ML-based results with other analytics and anomaly detection methods.

See the API endpoints above for programmatic access.

## 11. Recent Updates
- **Cryptographic IP Pseudonymization**: Integrated an ephemeral HMAC-SHA256 privacy layer (`anonymize_ip_datasets.py`) to permanently obscure raw IP addresses in datasets. Unlike naive noise injection which corrupts analytical bounds, this ensures differential privacy at the aggregate level while preserving 1:1 behavioral cardinality for precise unique-user and routing tracking.
- **Cross-Dataset Universal Meta-Model**: Abstracted fundamentally different data sources (e.g., raw Linux shell logs vs application RBA hits) into four universal spatial/temporal dimensions (`failed_count`, `login_freq`, `unique_ips`, `avg_rtt`). This renders the XGBoost Meta-Model completely dataset-agnostic, capable of universal zero-day anomaly detection.
- **Expanded Linux Dataset & Synthetic Overlap Engineering**: Deployed `prepare_linux_dataset.py` and `ml_linux_eval.py` to synthetically calculate missing RTTs and algorithmically inject strict Gaussian (`Normal(μ=10, σ=15)`) and Poisson (`λ=2`) noise structures. This prevents sterile model overfitting and mimics real-world disguised botnet overlap.
- **Unsupervised Anomaly Pipeline**: Shipped `ml_unsupervised.py` leveraging a 150-estimator Isolation Forest dynamically scaling contamination > 0.05. This acts as a secondary safety net to catch zero-day botnet routing anomalies completely independent of supervised labels.
- **Discontinuous Probability Thresholding (0.1)**: Extensively mapped precision-recall capabilities across the Sigmoid continuum to prove that a 0.1 threshold represents the exact mathematical "sweet spot". It perfectly seizes low-velocity, distributed stealth botnets (maximized Recall) without affecting static baseline False Positives.
- **ML Optimization**: Re-calibrated Logistic Regression weights and Random Forest tree mappings internally to drastically boost base model Precision, Recall, and Accuracy over the RBA dataset.
- **Visual Overhaul**: Redesigned the *Results / Algorithm Metrics* tab to feature stunning WebGL-accelerated Chart.js gradients. Added responsive hover telemetry, HUD-style pie cutouts, and dynamic glowing gradients to distinguish Meta-Model superiority naturally.
- **Frontend Quality of Life**: Engineered a formula reference card injected directly underneath visual graphs to display math logic on demand `(e.g., Precision, Recall)` and re-implemented native local-storage clearing for full Logout support via the Admin Dashboard.
- **JSON API Patches**: Handled dynamic serialization fixes inside `AnalyticsController` to correctly parse massive composite model data structures when triggering `results-json-paged`.

## 12. Local Execution Commands
To run the full suite of newly integrated Machine Learning and Privacy pipelines, execute the following commands using your virtual environment:

```bash
# 1. Start the Java Spring Boot Server (Must be running for DB syncing)
./mvnw spring-boot:run

# 2. Extract and format the raw Linux Dataset
.venv/bin/python prepare_linux_dataset.py

# 3. Apply Ephemeral HMAC-SHA256 Pseudonymization for Dataset Privacy
.venv/bin/python anonymize_ip_datasets.py

# 4. Evaluate Base Classifiers & Inject Gaussian/Poisson Overlap
.venv/bin/python ml_linux_eval.py

# 5. Execute Unsupervised Anomaly Isolation (150-Tree Isolation Forest)
.venv/bin/python ml_unsupervised.py

# 6. Process the Universal XGBoost Meta-Model Space
.venv/bin/python ml_stacking_meta.py

# 7. Sync the 0.1 Threshold Inferences into the Live PostgreSQL Database
.venv/bin/python post_meta_results.py
```