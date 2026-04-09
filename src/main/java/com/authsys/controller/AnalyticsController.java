package com.authsys.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth/analytics")
public class AnalyticsController {

            // --- Serve paginated ML results from JSON files (raw and DP) ---
            @GetMapping("/rba/ml/results-json-paged")
            public Map<String, Object> getMlResultsPaged(@RequestParam(defaultValue = "raw") String type,
                                                         @RequestParam(defaultValue = "1") int page,
                                                         @RequestParam(defaultValue = "100") int pageSize) throws java.io.IOException {
                String file = type.equalsIgnoreCase("dp") ? "ml_results_dp.json" : "ml_results.json";
                java.nio.file.Path path = java.nio.file.Paths.get(file);
                if (!java.nio.file.Files.exists(path)) {
                    return Map.of("total", 0, "results", List.of());
                }
                String json = java.nio.file.Files.readString(path);
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                List<Map<String, Object>> all = mapper.readValue(json, List.class);
                int total = all.size();
                int from = Math.max(0, (page - 1) * pageSize);
                int to = Math.min(total, from + pageSize);
                List<Map<String, Object>> pageResults = (from < to) ? all.subList(from, to) : List.of();
                return Map.of("total", total, "results", pageResults);
            }
        // --- ML MODELS ON DIFFERENTIALLY PRIVATE RBA DATASET ---
        @GetMapping("/rba/ml/logistic-dp")
        public List<Map<String, Object>> rbaMlLogisticDp(@RequestParam(defaultValue = "laplace") String method,
                                                         @RequestParam(defaultValue = "1.0") double epsilon,
                                                         @RequestParam(defaultValue = "1e-5") double delta) {
            double[] weights = { -2.0, 0.5, 0.2, 0.1, 0.05 };
            String sql = "SELECT username, COUNT(*) AS failed_count FROM rba_login_logs WHERE success = false GROUP BY username";
            List<Map<String, Object>> rows = jdbc.queryForList(sql);
            List<Map<String, Object>> result = new java.util.ArrayList<>();
            for (Map<String, Object> row : rows) {
                double raw = ((Number)row.get("failed_count")).doubleValue();
                double noisy = method.equalsIgnoreCase("gaussian")
                    ? com.authsys.privacy.DifferentialPrivacyUtil.addGaussianNoise(raw, epsilon, delta)
                    : com.authsys.privacy.DifferentialPrivacyUtil.addLaplaceNoise(raw, epsilon);
                double[] features = { noisy, 0, 0, 0 };
                double prob = com.authsys.ml.MLModels.logisticRegression(weights, features);
                result.add(Map.of(
                    "username", row.get("username"),
                    "failed_count_noisy", noisy,
                    "prob_attack", prob,
                    "predicted_attack", prob >= 0.5
                ));
            }
            return result;
        }

        @GetMapping("/rba/ml/randomforest-dp")
        public List<Map<String, Object>> rbaMlRandomForestDp(@RequestParam(defaultValue = "laplace") String method,
                                                            @RequestParam(defaultValue = "1.0") double epsilon,
                                                            @RequestParam(defaultValue = "1e-5") double delta) {
            java.util.List<java.util.List<Double>> trees = java.util.List.of(
                java.util.List.of(10.0, 0.0, 1.0),
                java.util.List.of(20.0, 0.0, 1.0),
                java.util.List.of(15.0, 1.0, 0.0)
            );
            String sql = "SELECT username, COUNT(*) AS failed_count FROM rba_login_logs WHERE success = false GROUP BY username";
            List<Map<String, Object>> rows = jdbc.queryForList(sql);
            List<Map<String, Object>> result = new java.util.ArrayList<>();
            for (Map<String, Object> row : rows) {
                double raw = ((Number)row.get("failed_count")).doubleValue();
                double noisy = method.equalsIgnoreCase("gaussian")
                    ? com.authsys.privacy.DifferentialPrivacyUtil.addGaussianNoise(raw, epsilon, delta)
                    : com.authsys.privacy.DifferentialPrivacyUtil.addLaplaceNoise(raw, epsilon);
                double[] features = { noisy, 0, 0, 0 };
                int pred = com.authsys.ml.MLModels.randomForest(trees, features);
                result.add(Map.of(
                    "username", row.get("username"),
                    "failed_count_noisy", noisy,
                    "predicted_attack", pred == 1
                ));
            }
            return result;
        }
    // --- ML MODELS ON RBA DATASET (PRE-TRAINED/FIXED) ---
    // These endpoints use pre-set (fixed) model weights/trees, simulating pre-trained models.
    // No training occurs per request; only inference is performed.

    private static final double[] LOGISTIC_WEIGHTS = { -2.0, 0.5, 0.2, 0.1, 0.05 };
    private static final java.util.List<java.util.List<Double>> RF_TREES = java.util.List.of(
        java.util.List.of(10.0, 0.0, 1.0),
        java.util.List.of(20.0, 0.0, 1.0),
        java.util.List.of(15.0, 1.0, 0.0)
    );

    /**
     * Logistic Regression (pre-trained/fixed weights) on RBA dataset.
     * No training is performed per request; only inference.
     */
    @GetMapping("/rba/ml/logistic")
    public List<Map<String, Object>> rbaMlLogistic() {
        String sql = "SELECT username, COUNT(*) AS failed_count FROM rba_login_logs WHERE success = false GROUP BY username";
        List<Map<String, Object>> rows = jdbc.queryForList(sql);
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (Map<String, Object> row : rows) {
            double[] features = { ((Number)row.get("failed_count")).doubleValue(), 0, 0, 0 };
            double prob = com.authsys.ml.MLModels.logisticRegression(LOGISTIC_WEIGHTS, features);
            result.add(Map.of(
                "username", row.get("username"),
                "failed_count", features[0],
                "prob_attack", prob,
                "predicted_attack", prob >= 0.5
            ));
        }
        return result;
    }

    /**
     * Random Forest (pre-trained/fixed trees) on RBA dataset.
     * No training is performed per request; only inference.
     */
    @GetMapping("/rba/ml/randomforest")
    public List<Map<String, Object>> rbaMlRandomForest() {
        String sql = "SELECT username, COUNT(*) AS failed_count FROM rba_login_logs WHERE success = false GROUP BY username";
        List<Map<String, Object>> rows = jdbc.queryForList(sql);
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (Map<String, Object> row : rows) {
            double[] features = { ((Number)row.get("failed_count")).doubleValue(), 0, 0, 0 };
            int pred = com.authsys.ml.MLModels.randomForest(RF_TREES, features);
            result.add(Map.of(
                "username", row.get("username"),
                "failed_count", features[0],
                "predicted_attack", pred == 1
            ));
        }
        return result;
    }

    private final JdbcTemplate jdbc;
    private final com.authsys.service.AuthService authService;

    public AnalyticsController(JdbcTemplate jdbc, com.authsys.service.AuthService authService) {
        this.jdbc = jdbc;
        this.authService = authService;
    }

    // ---------------- AUDIT LOGS ----------------
    @GetMapping("/failed-logins")
    public List<Map<String, Object>> failedLogins(@RequestParam String dataset) {

        String sql = dataset.equals("cert")
                ? """
                    SELECT username, COUNT(*) AS count
                    FROM cert_login_logs
                    WHERE activity = 'Logon'
                    GROUP BY username
                  """
                : """
                    SELECT username, COUNT(*) AS count
                    FROM login_logs
                    WHERE success = false
                    GROUP BY username
                  """;

        return jdbc.queryForList(sql);
    }

    // ---------------- ANOMALIES ----------------
    @GetMapping("/anomalies")
    public List<Map<String, Object>> anomalies(
            @RequestParam String dataset,
            @RequestParam int threshold) {

        String sql = dataset.equals("cert")
                ? """
                    SELECT username,
                           COUNT(*) AS count,
                           COUNT(*) >= ? AS anomalous
                    FROM cert_login_logs
                    WHERE activity = 'Logon'
                    GROUP BY username
                  """
                : """
                    SELECT username,
                           COUNT(*) AS count,
                           COUNT(*) >= ? AS anomalous
                    FROM login_logs
                    WHERE success = false
                    GROUP BY username
                  """;

        return jdbc.queryForList(sql, threshold);
    }

    // ---------------- TIME WINDOW IDS ----------------
    @GetMapping("/time-window")
    public List<Map<String, Object>> timeWindow(@RequestParam String dataset) {

        String sql = dataset.equals("cert")
                ? """
                    SELECT username, COUNT(*) AS count
                    FROM cert_login_logs
                    WHERE activity = 'Logon'
                    AND event_time >= (
                        SELECT MAX(event_time) FROM cert_login_logs
                    ) - INTERVAL '30 minutes'
                    GROUP BY username
                  """
                : """
                    SELECT username, COUNT(*) AS count
                    FROM login_logs
                    WHERE success = false
                    AND created_at >= NOW() - INTERVAL '30 minutes'
                    GROUP BY username
                  """;

        return jdbc.queryForList(sql);
    }

    // ---------------- Z-SCORE ANOMALY ENDPOINT ----------------
    @GetMapping("/zscore-anomalies")
    public List<Map<String, Object>> zscoreAnomalies(
            @RequestParam String dataset,
            @RequestParam double threshold) {
        // Use the same approach as other endpoints: fetch raw data from DB, not via AuthService
        String sql = dataset.equals("cert")
                ? """
                    SELECT username, COUNT(*) AS count
                    FROM cert_login_logs
                    WHERE activity = 'Logon'
                    GROUP BY username
                  """
                : """
                    SELECT username, COUNT(*) AS count
                    FROM login_logs
                    WHERE success = false
                    GROUP BY username
                  """;
        List<Map<String, Object>> rows = jdbc.queryForList(sql);
        // Compute mean and stddev
        double[] counts = rows.stream().mapToDouble(r -> ((Number) r.get("count")).doubleValue()).toArray();
        double mean = java.util.Arrays.stream(counts).average().orElse(0);
        double stddev = Math.sqrt(java.util.Arrays.stream(counts).map(c -> (c - mean) * (c - mean)).average().orElse(0));
        // Add z-score anomaly flag
        return rows.stream().map(r -> {
            double count = ((Number) r.get("count")).doubleValue();
            double z = (stddev == 0) ? 0 : (count - mean) / stddev;
            return Map.of(
                "username", r.get("username"),
                "count", count,
                "anomalous", Math.abs(z) >= threshold
            );
        }).toList();
    }

    // ---------------- RBA DATASET ANALYTICS ----------------
    @GetMapping("/rba/failed-logins")
    public List<Map<String, Object>> rbaFailedLogins(@RequestParam(defaultValue = "100") int limit, @RequestParam(defaultValue = "0") int offset) {
        String sql = "SELECT username, COUNT(*) AS count FROM rba_login_logs WHERE success = false GROUP BY username ORDER BY count DESC LIMIT ? OFFSET ?";
        return jdbc.queryForList(sql, limit, offset);
    }

    @GetMapping("/rba/time-window")
    public List<Map<String, Object>> rbaTimeWindow(@RequestParam(defaultValue = "100") int limit) {
        String sql = "SELECT username, COUNT(*) AS count FROM rba_login_logs WHERE success = false AND created_at >= NOW() - INTERVAL '30 minutes' GROUP BY username ORDER BY count DESC LIMIT ?";
        return jdbc.queryForList(sql, limit);
    }

    @GetMapping("/rba/anomalies")
    public List<Map<String, Object>> rbaAnomalies(@RequestParam int threshold, @RequestParam(defaultValue = "100") int limit) {
        String sql = "SELECT username, COUNT(*) AS count, COUNT(*) >= ? AS anomalous FROM rba_login_logs WHERE success = false GROUP BY username ORDER BY count DESC LIMIT ?";
        return jdbc.queryForList(sql, threshold, limit);
    }

    @GetMapping("/rba/zscore-anomalies")
    public List<Map<String, Object>> rbaZScoreAnomalies(@RequestParam double threshold, @RequestParam(defaultValue = "100") int limit) {
        String sql = "SELECT username, COUNT(*) AS count FROM rba_login_logs WHERE success = false GROUP BY username ORDER BY count DESC LIMIT ?";
        List<Map<String, Object>> rows = jdbc.queryForList(sql, limit);
        double[] counts = rows.stream().mapToDouble(r -> ((Number) r.get("count")).doubleValue()).toArray();
        double mean = java.util.Arrays.stream(counts).average().orElse(0);
        double stddev = Math.sqrt(java.util.Arrays.stream(counts).map(c -> (c - mean) * (c - mean)).average().orElse(0));
        return rows.stream().map(r -> {
            double count = ((Number) r.get("count")).doubleValue();
            double z = (stddev == 0) ? 0 : (count - mean) / stddev;
            return Map.of(
                "username", r.get("username"),
                "count", count,
                "anomalous", Math.abs(z) >= threshold
            );
        }).toList();
    }

    @GetMapping("/rba/attack-labels")
    public List<Boolean> rbaAttackLabels() {
        return authService.getRbaAttackLabels();
    }

    // ---------------- RBA USER COUNT (for pagination) ----------------
    @GetMapping("/rba/user-count")
    public int rbaUserCount() {
        String sql = "SELECT COUNT(DISTINCT username) FROM rba_login_logs";
        Integer count = jdbc.queryForObject(sql, Integer.class);
        return count != null ? count : 0;
    }

    // ---------------- RBA ACCURACY COMPARISON (SINGLE-THRESHOLD, ALL ALGO, BASELINE) ----------------
    @GetMapping("/rba/accuracy-comparison")
    public Map<String, Object> rbaAccuracyComparison(
            @RequestParam(defaultValue = "100") int limit) {
        // Single thresholds for Laplace and Gaussian
        double laplaceThreshold = 3;
        double gaussianDelta = 1e-5;
        int anomalyThreshold = 3; // for count-based anomaly
        double zscoreThreshold = 2; // for z-score
        int anomalyThreshold5 = 5;
        int anomalyThreshold10 = 10;

        // Get all users and their ground truth
        String sql = "SELECT username, BOOL_OR(is_attack_ip) AS is_attack_ip FROM rba_login_logs GROUP BY username ORDER BY COUNT(*) DESC LIMIT ?";
        List<Map<String, Object>> users = jdbc.queryForList(sql, limit);
        // Get failed login counts
        String lapSql = "SELECT username, COUNT(*) AS count FROM rba_login_logs WHERE success = false GROUP BY username ORDER BY count DESC LIMIT ?";
        List<Map<String, Object>> lapRows = jdbc.queryForList(lapSql, limit);
        Map<String, Integer> lapCounts = new java.util.HashMap<>();
        for (Map<String, Object> row : lapRows) lapCounts.put((String)row.get("username"), ((Number)row.get("count")).intValue());
        double[] counts = lapRows.stream().mapToDouble(r -> ((Number) r.get("count")).doubleValue()).toArray();
        double mean = java.util.Arrays.stream(counts).average().orElse(0);
        double stddev = Math.sqrt(java.util.Arrays.stream(counts).map(c -> (c - mean) * (c - mean)).average().orElse(0));

        // Compose result for each user
        java.util.Random rng = new java.util.Random(42); // fixed seed for reproducibility
        double laplaceScale = 1.0; // Laplace scale (b)
        double gaussianStddev = 1.0; // Gaussian stddev (sigma)
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (Map<String, Object> user : users) {
            String username = (String) user.get("username");
            boolean isAttack = Boolean.TRUE.equals(user.get("is_attack_ip"));
            int count = lapCounts.getOrDefault(username, 0);
            // Laplace: add Laplace noise to count
            double laplaceNoise = -laplaceScale * Math.signum(rng.nextDouble() - 0.5) * Math.log(1 - 2 * Math.abs(rng.nextDouble() - 0.5));
            double laplaceNoisyCount = count + laplaceNoise;
            boolean laplaceAnomaly = laplaceNoisyCount >= laplaceThreshold;
            // Gaussian: add Gaussian noise to count
            double gaussianNoise = rng.nextGaussian() * gaussianStddev;
            double gaussianNoisyCount = count + gaussianNoise;
            boolean gaussianAnomaly = gaussianNoisyCount >= anomalyThreshold;
            // Z-Score: abs(z) >= zscoreThreshold
            double z = (stddev == 0) ? 0 : (count - mean) / stddev;
            boolean zscoreAnomaly = Math.abs(z) >= zscoreThreshold;
            // Anomaly Detection: Laplace noisy count >= 5 and >= 10
            boolean anomalyDetection5 = laplaceNoisyCount >= anomalyThreshold5;
            boolean anomalyDetection10 = laplaceNoisyCount >= anomalyThreshold10;
            result.add(Map.of(
                "username", username,
                "is_attack_ip", isAttack,
                "laplace_anomaly", laplaceAnomaly,
                "gaussian_anomaly", gaussianAnomaly,
                "zscore_anomaly", zscoreAnomaly,
                "anomaly_detection_5", anomalyDetection5,
                "anomaly_detection_10", anomalyDetection10
            ));
        }
        // Compute accuracy for each algorithm/threshold
        int total = result.size();
        int lapCorrect = 0, gauCorrect = 0, zCorrect = 0, anomaly5Correct = 0, anomaly10Correct = 0;
        for (Map<String, Object> row : result) {
            boolean truth = Boolean.TRUE.equals(row.get("is_attack_ip"));
            if (Boolean.TRUE.equals(row.get("laplace_anomaly")) == truth) lapCorrect++;
            if (Boolean.TRUE.equals(row.get("gaussian_anomaly")) == truth) gauCorrect++;
            if (Boolean.TRUE.equals(row.get("zscore_anomaly")) == truth) zCorrect++;
            if (Boolean.TRUE.equals(row.get("anomaly_detection_5")) == truth) anomaly5Correct++;
            if (Boolean.TRUE.equals(row.get("anomaly_detection_10")) == truth) anomaly10Correct++;
        }
        Map<String, Object> accuracy = Map.of(
            "Laplace", Math.round(100.0 * lapCorrect / total),
            "Gaussian", Math.round(100.0 * gauCorrect / total),
            "Z-Score", Math.round(100.0 * zCorrect / total),
            "Anomaly Detection (5)", Math.round(100.0 * anomaly5Correct / total),
            "Anomaly Detection (10)", Math.round(100.0 * anomaly10Correct / total)
        );
        // Also return ground truth for charting
        int attackCount = 0;
        for (Map<String, Object> row : result) {
            if (Boolean.TRUE.equals(row.get("is_attack_ip"))) attackCount++;
        }
        Map<String, Object> groundTruth = Map.of(
            "attack", attackCount,
            "benign", result.size() - attackCount
        );
        return Map.of("accuracy", accuracy, "details", result, "groundTruth", groundTruth);
    }

    // ---------------- RBA METRICS COMPARISON (PRECISION, RECALL, F1, FP, FN) ----------------
    @GetMapping("/rba/metrics-comparison")
    public Map<String, Object> rbaMetricsComparison(@RequestParam(defaultValue = "100") int limit) {
        double laplaceThreshold = 3;
        int anomalyThreshold = 3;
        double zscoreThreshold = 2;
        int anomalyThreshold5 = 5;
        int anomalyThreshold10 = 10;
        String sql = "SELECT username, BOOL_OR(is_attack_ip) AS is_attack_ip FROM rba_login_logs GROUP BY username ORDER BY COUNT(*) DESC LIMIT ?";
        List<Map<String, Object>> users = jdbc.queryForList(sql, limit);
        String lapSql = "SELECT username, COUNT(*) AS count FROM rba_login_logs WHERE success = false GROUP BY username ORDER BY count DESC LIMIT ?";
        List<Map<String, Object>> lapRows = jdbc.queryForList(lapSql, limit);
        Map<String, Integer> lapCounts = new java.util.HashMap<>();
        for (Map<String, Object> row : lapRows) lapCounts.put((String)row.get("username"), ((Number)row.get("count")).intValue());
        double[] counts = lapRows.stream().mapToDouble(r -> ((Number) r.get("count")).doubleValue()).toArray();
        double mean = java.util.Arrays.stream(counts).average().orElse(0);
        double stddev = Math.sqrt(java.util.Arrays.stream(counts).map(c -> (c - mean) * (c - mean)).average().orElse(0));
        java.util.Random rng = new java.util.Random(42);
        double laplaceScale = 1.0;
        double gaussianStddev = 1.0;
        int lapTP=0, lapFP=0, lapFN=0;
        int gauTP=0, gauFP=0, gauFN=0;
        int zTP=0, zFP=0, zFN=0;
        int anomaly5TP=0, anomaly5FP=0, anomaly5FN=0;
        int anomaly10TP=0, anomaly10FP=0, anomaly10FN=0;

        // ML metrics counters
        int logregTP=0, logregFP=0, logregFN=0;
        int rfTP=0, rfFP=0, rfFN=0;
        int logregDpTP=0, logregDpFP=0, logregDpFN=0;
        int rfDpTP=0, rfDpFP=0, rfDpFN=0;

        // Pre-trained weights/trees (same as used in endpoints)
        double[] LOGISTIC_WEIGHTS = { -2.0, 0.5, 0.2, 0.1, 0.05 };
        java.util.List<java.util.List<Double>> RF_TREES = java.util.List.of(
            java.util.List.of(10.0, 0.0, 1.0),
            java.util.List.of(20.0, 0.0, 1.0),
            java.util.List.of(15.0, 1.0, 0.0)
        );
        // DP noise for ML (Laplace, epsilon=1)
        double dpEps = 1.0;
        double dpDelta = 1e-5;

        for (Map<String, Object> user : users) {
            String username = (String) user.get("username");
            boolean isAttack = Boolean.TRUE.equals(user.get("is_attack_ip"));
            int count = lapCounts.getOrDefault(username, 0);
            double laplaceNoise = -laplaceScale * Math.signum(rng.nextDouble() - 0.5) * Math.log(1 - 2 * Math.abs(rng.nextDouble() - 0.5));
            double laplaceNoisyCount = count + laplaceNoise;
            boolean laplaceAnomaly = laplaceNoisyCount >= laplaceThreshold;
            double gaussianNoise = rng.nextGaussian() * gaussianStddev;
            double gaussianNoisyCount = count + gaussianNoise;
            boolean gaussianAnomaly = gaussianNoisyCount >= anomalyThreshold;
            double z = (stddev == 0) ? 0 : (count - mean) / stddev;
            boolean zscoreAnomaly = Math.abs(z) >= zscoreThreshold;
            boolean anomalyDetection5 = laplaceNoisyCount >= anomalyThreshold5;
            boolean anomalyDetection10 = laplaceNoisyCount >= anomalyThreshold10;
            // Laplace
            if (laplaceAnomaly && isAttack) lapTP++;
            if (laplaceAnomaly && !isAttack) lapFP++;
            if (!laplaceAnomaly && isAttack) lapFN++;
            // Gaussian
            if (gaussianAnomaly && isAttack) gauTP++;
            if (gaussianAnomaly && !isAttack) gauFP++;
            if (!gaussianAnomaly && isAttack) gauFN++;
            // Z-Score
            if (zscoreAnomaly && isAttack) zTP++;
            if (zscoreAnomaly && !isAttack) zFP++;
            if (!zscoreAnomaly && isAttack) zFN++;
            // Anomaly Detection (5)
            if (anomalyDetection5 && isAttack) anomaly5TP++;
            if (anomalyDetection5 && !isAttack) anomaly5FP++;
            if (!anomalyDetection5 && isAttack) anomaly5FN++;
            // Anomaly Detection (10)
            if (anomalyDetection10 && isAttack) anomaly10TP++;
            if (anomalyDetection10 && !isAttack) anomaly10FP++;
            if (!anomalyDetection10 && isAttack) anomaly10FN++;

            // --- ML METRICS ---
            // Logistic Regression (Raw)
            double[] features = { count, 0, 0, 0 };
            double logregProb = com.authsys.ml.MLModels.logisticRegression(LOGISTIC_WEIGHTS, features);
            boolean logregPred = logregProb >= 0.5;
            if (logregPred && isAttack) logregTP++;
            if (logregPred && !isAttack) logregFP++;
            if (!logregPred && isAttack) logregFN++;
            // Random Forest (Raw)
            int rfPred = com.authsys.ml.MLModels.randomForest(RF_TREES, features);
            if (rfPred == 1 && isAttack) rfTP++;
            if (rfPred == 1 && !isAttack) rfFP++;
            if (rfPred == 0 && isAttack) rfFN++;
            // Logistic Regression (DP)
            double noisy = com.authsys.privacy.DifferentialPrivacyUtil.addLaplaceNoise(count, dpEps);
            double[] dpFeatures = { noisy, 0, 0, 0 };
            double logregDpProb = com.authsys.ml.MLModels.logisticRegression(LOGISTIC_WEIGHTS, dpFeatures);
            boolean logregDpPred = logregDpProb >= 0.5;
            if (logregDpPred && isAttack) logregDpTP++;
            if (logregDpPred && !isAttack) logregDpFP++;
            if (!logregDpPred && isAttack) logregDpFN++;
            // Random Forest (DP)
            int rfDpPred = com.authsys.ml.MLModels.randomForest(RF_TREES, dpFeatures);
            if (rfDpPred == 1 && isAttack) rfDpTP++;
            if (rfDpPred == 1 && !isAttack) rfDpFP++;
            if (rfDpPred == 0 && isAttack) rfDpFN++;
        }
        java.util.function.BiFunction<Integer, Integer, Double> safeDiv = (a, b) -> b == 0 ? 0.0 : (double)a / b;
        Map<String, Object> metrics = new java.util.LinkedHashMap<>();
        // Existing algorithms
        metrics.put("Laplace", Map.of(
            "precision", safeDiv.apply(lapTP, lapTP+lapFP),
            "recall", safeDiv.apply(lapTP, lapTP+lapFN),
            "f1", (safeDiv.apply(lapTP, lapTP+lapFP)+safeDiv.apply(lapTP, lapTP+lapFN))==0?0:2*safeDiv.apply(lapTP, lapTP+lapFP)*safeDiv.apply(lapTP, lapTP+lapFN)/(safeDiv.apply(lapTP, lapTP+lapFP)+safeDiv.apply(lapTP, lapTP+lapFN)),
            "false_positives", lapFP,
            "false_negatives", lapFN
        ));
        metrics.put("Gaussian", Map.of(
            "precision", safeDiv.apply(gauTP, gauTP+gauFP),
            "recall", safeDiv.apply(gauTP, gauTP+gauFN),
            "f1", (safeDiv.apply(gauTP, gauTP+gauFP)+safeDiv.apply(gauTP, gauTP+gauFN))==0?0:2*safeDiv.apply(gauTP, gauTP+gauFP)*safeDiv.apply(gauTP, gauTP+gauFN)/(safeDiv.apply(gauTP, gauTP+gauFP)+safeDiv.apply(gauTP, gauTP+gauFN)),
            "false_positives", gauFP,
            "false_negatives", gauFN
        ));
        metrics.put("Z-Score", Map.of(
            "precision", safeDiv.apply(zTP, zTP+zFP),
            "recall", safeDiv.apply(zTP, zTP+zFN),
            "f1", (safeDiv.apply(zTP, zTP+zFP)+safeDiv.apply(zTP, zTP+zFN))==0?0:2*safeDiv.apply(zTP, zTP+zFP)*safeDiv.apply(zTP, zTP+zFN)/(safeDiv.apply(zTP, zTP+zFP)+safeDiv.apply(zTP, zTP+zFN)),
            "false_positives", zFP,
            "false_negatives", zFN
        ));
        metrics.put("Anomaly Detection (5)", Map.of(
            "precision", safeDiv.apply(anomaly5TP, anomaly5TP+anomaly5FP),
            "recall", safeDiv.apply(anomaly5TP, anomaly5TP+anomaly5FN),
            "f1", (safeDiv.apply(anomaly5TP, anomaly5TP+anomaly5FP)+safeDiv.apply(anomaly5TP, anomaly5TP+anomaly5FN))==0?0:2*safeDiv.apply(anomaly5TP, anomaly5TP+anomaly5FP)*safeDiv.apply(anomaly5TP, anomaly5TP+anomaly5FN)/(safeDiv.apply(anomaly5TP, anomaly5TP+anomaly5FP)+safeDiv.apply(anomaly5TP, anomaly5TP+anomaly5FN)),
            "false_positives", anomaly5FP,
            "false_negatives", anomaly5FN
        ));
        metrics.put("Anomaly Detection (10)", Map.of(
            "precision", safeDiv.apply(anomaly10TP, anomaly10TP+anomaly10FP),
            "recall", safeDiv.apply(anomaly10TP, anomaly10TP+anomaly10FN),
            "f1", (safeDiv.apply(anomaly10TP, anomaly10TP+anomaly10FP)+safeDiv.apply(anomaly10TP, anomaly10TP+anomaly10FN))==0?0:2*safeDiv.apply(anomaly10TP, anomaly10TP+anomaly10FP)*safeDiv.apply(anomaly10TP, anomaly10TP+anomaly10FN)/(safeDiv.apply(anomaly10TP, anomaly10TP+anomaly10FP)+safeDiv.apply(anomaly10TP, anomaly10TP+anomaly10FN)),
            "false_positives", anomaly10FP,
            "false_negatives", anomaly10FN
        ));
        // ML metrics
        metrics.put("LogReg (Raw)", Map.of(
            "precision", safeDiv.apply(logregTP, logregTP+logregFP),
            "recall", safeDiv.apply(logregTP, logregTP+logregFN),
            "f1", (safeDiv.apply(logregTP, logregTP+logregFP)+safeDiv.apply(logregTP, logregTP+logregFN))==0?0:2*safeDiv.apply(logregTP, logregTP+logregFP)*safeDiv.apply(logregTP, logregTP+logregFN)/(safeDiv.apply(logregTP, logregTP+logregFP)+safeDiv.apply(logregTP, logregTP+logregFN)),
            "false_positives", logregFP,
            "false_negatives", logregFN
        ));
        metrics.put("RF (Raw)", Map.of(
            "precision", safeDiv.apply(rfTP, rfTP+rfFP),
            "recall", safeDiv.apply(rfTP, rfTP+rfFN),
            "f1", (safeDiv.apply(rfTP, rfTP+rfFP)+safeDiv.apply(rfTP, rfTP+rfFN))==0?0:2*safeDiv.apply(rfTP, rfTP+rfFP)*safeDiv.apply(rfTP, rfTP+rfFN)/(safeDiv.apply(rfTP, rfTP+rfFP)+safeDiv.apply(rfTP, rfTP+rfFN)),
            "false_positives", rfFP,
            "false_negatives", rfFN
        ));
        metrics.put("LogReg (DP)", Map.of(
            "precision", safeDiv.apply(logregDpTP, logregDpTP+logregDpFP),
            "recall", safeDiv.apply(logregDpTP, logregDpTP+logregDpFN),
            "f1", (safeDiv.apply(logregDpTP, logregDpTP+logregDpFP)+safeDiv.apply(logregDpTP, logregDpTP+logregDpFN))==0?0:2*safeDiv.apply(logregDpTP, logregDpTP+logregDpFP)*safeDiv.apply(logregDpTP, logregDpTP+logregDpFN)/(safeDiv.apply(logregDpTP, logregDpTP+logregDpFP)+safeDiv.apply(logregDpTP, logregDpTP+logregDpFN)),
            "false_positives", logregDpFP,
            "false_negatives", logregDpFN
        ));
        metrics.put("RF (DP)", Map.of(
            "precision", safeDiv.apply(rfDpTP, rfDpTP+rfDpFP),
            "recall", safeDiv.apply(rfDpTP, rfDpTP+rfDpFN),
            "f1", (safeDiv.apply(rfDpTP, rfDpTP+rfDpFP)+safeDiv.apply(rfDpTP, rfDpTP+rfDpFN))==0?0:2*safeDiv.apply(rfDpTP, rfDpTP+rfDpFP)*safeDiv.apply(rfDpTP, rfDpTP+rfDpFN)/(safeDiv.apply(rfDpTP, rfDpTP+rfDpFP)+safeDiv.apply(rfDpTP, rfDpTP+rfDpFN)),
            "false_positives", rfDpFP,
            "false_negatives", rfDpFN
        ));
        return Map.of("metrics", metrics);
    }
}