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
    public List<Map<String, Object>> rbaFailedLogins(@RequestParam(defaultValue = "100") int limit) {
        String sql = "SELECT username, COUNT(*) AS count FROM rba_login_logs WHERE success = false GROUP BY username ORDER BY count DESC LIMIT ?";
        return jdbc.queryForList(sql, limit);
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

    // ---------------- RBA ACCURACY COMPARISON (SINGLE-THRESHOLD, ALL ALGO, BASELINE) ----------------
    @GetMapping("/rba/accuracy-comparison")
    public Map<String, Object> rbaAccuracyComparison(
            @RequestParam(defaultValue = "100") int limit) {
        // Single thresholds for Laplace and Gaussian
        double laplaceThreshold = 3;
        double gaussianDelta = 1e-5;
        int anomalyThreshold = 3; // for count-based anomaly
        double zscoreThreshold = 2; // for z-score

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
            // Baseline: no algorithm, always predict benign (false)
            boolean noAlgoAnomaly = false;
            result.add(Map.of(
                "username", username,
                "is_attack_ip", isAttack,
                "laplace_anomaly", laplaceAnomaly,
                "gaussian_anomaly", gaussianAnomaly,
                "zscore_anomaly", zscoreAnomaly,
                "no_algo_anomaly", noAlgoAnomaly
            ));
        }
        // Compute accuracy for each algorithm/threshold
        int total = result.size();
        int lapCorrect = 0, gauCorrect = 0, zCorrect = 0, noAlgoCorrect = 0;
        for (Map<String, Object> row : result) {
            boolean truth = Boolean.TRUE.equals(row.get("is_attack_ip"));
            if (Boolean.TRUE.equals(row.get("laplace_anomaly")) == truth) lapCorrect++;
            if (Boolean.TRUE.equals(row.get("gaussian_anomaly")) == truth) gauCorrect++;
            if (Boolean.TRUE.equals(row.get("zscore_anomaly")) == truth) zCorrect++;
            if (Boolean.TRUE.equals(row.get("no_algo_anomaly")) == truth) noAlgoCorrect++;
        }
        Map<String, Object> accuracy = Map.of(
            "Laplace", Math.round(100.0 * lapCorrect / total),
            "Gaussian", Math.round(100.0 * gauCorrect / total),
            "Z-Score", Math.round(100.0 * zCorrect / total),
            "No Algorithm", Math.round(100.0 * noAlgoCorrect / total)
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
}
