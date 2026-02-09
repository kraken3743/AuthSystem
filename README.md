# Privacy-Preserving Authentication & Login Anomaly Detection

This project implements a secure authentication system with:
- Differential Privacy–based login analytics
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

## How to Run
1. Configure PostgreSQL
2. Update `application.properties`
3. Run:
```bash
./mvn spring-boot:run
