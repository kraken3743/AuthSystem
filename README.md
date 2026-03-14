# Privacy-Preserving Authentication & Login Anomaly Detection

This project implements a secure authentication system with:
- Differential Privacy–based login analytics (Laplace and Gaussian mechanisms)
- Threshold & time-window anomaly detection
- Support for both manual login data and CERT insider threat datasets
- Role-based access control (Admin/User)
- Interactive security analytics dashboard

## Tech Stack
- Java, Spring Boot
- PostgreSQL
- HTML, CSS, JavaScript
- Chart.js

## Datasets
- CERT Insider Threat Dataset (logon.csv)
> Dataset files are not included due to size.  
> Download from: https://resources.sei.cmu.edu/library/asset-view.cfm?assetid=508099

## Differential Privacy Mechanisms

The dashboard supports two mechanisms:
- **Laplace Mechanism**: Adds Laplace noise to query results, parameterized by ε (epsilon).
- **Gaussian Mechanism**: Adds Gaussian noise to query results, parameterized by ε (epsilon) and δ (delta).

You can select the mechanism and customize ε and δ in the dashboard controls. All analytics (audit logs, anomaly detection, time-window IDS) can be viewed with either mechanism, and charts/tables are labeled accordingly.

## Pipeline Diagram

```mermaid
graph TD;
    A[User/Register/Login] --> B[Spring Boot Backend]
    B --> C[Login Logs DB]
    B --> D[Analytics Controller]
    D --> E[Apply Differential Privacy (Laplace/Gaussian)]
    E --> F[REST API]
    F --> G[Dashboard Frontend]
    G --> H[Chart.js Visualization]
```

## How to Run
1. Configure PostgreSQL
2. Update `application.properties`
3. Run:
```bash
./mvn spring-boot:run
```
