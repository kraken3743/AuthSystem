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
}
