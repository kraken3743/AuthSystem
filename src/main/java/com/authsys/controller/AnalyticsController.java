package com.authsys.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth/analytics")
public class AnalyticsController {

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
        }
        java.util.function.BiFunction<Integer, Integer, Double> safeDiv = (a, b) -> b == 0 ? 0.0 : (double)a / b;
        Map<String, Object> metrics = Map.of(
            "Laplace", Map.of(
                "precision", safeDiv.apply(lapTP, lapTP+lapFP),
                "recall", safeDiv.apply(lapTP, lapTP+lapFN),
                "f1", (safeDiv.apply(lapTP, lapTP+lapFP)+safeDiv.apply(lapTP, lapTP+lapFN))==0?0:2*safeDiv.apply(lapTP, lapTP+lapFP)*safeDiv.apply(lapTP, lapTP+lapFN)/(safeDiv.apply(lapTP, lapTP+lapFP)+safeDiv.apply(lapTP, lapTP+lapFN)),
                "false_positives", lapFP,
                "false_negatives", lapFN
            ),
            "Gaussian", Map.of(
                "precision", safeDiv.apply(gauTP, gauTP+gauFP),
                "recall", safeDiv.apply(gauTP, gauTP+gauFN),
                "f1", (safeDiv.apply(gauTP, gauTP+gauFP)+safeDiv.apply(gauTP, gauTP+gauFN))==0?0:2*safeDiv.apply(gauTP, gauTP+gauFP)*safeDiv.apply(gauTP, gauTP+gauFN)/(safeDiv.apply(gauTP, gauTP+gauFP)+safeDiv.apply(gauTP, gauTP+gauFN)),
                "false_positives", gauFP,
                "false_negatives", gauFN
            ),
            "Z-Score", Map.of(
                "precision", safeDiv.apply(zTP, zTP+zFP),
                "recall", safeDiv.apply(zTP, zTP+zFN),
                "f1", (safeDiv.apply(zTP, zTP+zFP)+safeDiv.apply(zTP, zTP+zFN))==0?0:2*safeDiv.apply(zTP, zTP+zFP)*safeDiv.apply(zTP, zTP+zFN)/(safeDiv.apply(zTP, zTP+zFP)+safeDiv.apply(zTP, zTP+zFN)),
                "false_positives", zFP,
                "false_negatives", zFN
            ),
            "Anomaly Detection (5)", Map.of(
                "precision", safeDiv.apply(anomaly5TP, anomaly5TP+anomaly5FP),
                "recall", safeDiv.apply(anomaly5TP, anomaly5TP+anomaly5FN),
                "f1", (safeDiv.apply(anomaly5TP, anomaly5TP+anomaly5FP)+safeDiv.apply(anomaly5TP, anomaly5TP+anomaly5FN))==0?0:2*safeDiv.apply(anomaly5TP, anomaly5TP+anomaly5FP)*safeDiv.apply(anomaly5TP, anomaly5TP+anomaly5FN)/(safeDiv.apply(anomaly5TP, anomaly5TP+anomaly5FP)+safeDiv.apply(anomaly5TP, anomaly5TP+anomaly5FN)),
                "false_positives", anomaly5FP,
                "false_negatives", anomaly5FN
            ),
            "Anomaly Detection (10)", Map.of(
                "precision", safeDiv.apply(anomaly10TP, anomaly10TP+anomaly10FP),
                "recall", safeDiv.apply(anomaly10TP, anomaly10TP+anomaly10FN),
                "f1", (safeDiv.apply(anomaly10TP, anomaly10TP+anomaly10FP)+safeDiv.apply(anomaly10TP, anomaly10TP+anomaly10FN))==0?0:2*safeDiv.apply(anomaly10TP, anomaly10TP+anomaly10FP)*safeDiv.apply(anomaly10TP, anomaly10TP+anomaly10FN)/(safeDiv.apply(anomaly10TP, anomaly10TP+anomaly10FP)+safeDiv.apply(anomaly10TP, anomaly10TP+anomaly10FN)),
                "false_positives", anomaly10FP,
                "false_negatives", anomaly10FN
            )
        );
        return Map.of("metrics", metrics);
    }
}
