package com.authsys.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/auth/analytics")
public class AnalyticsController {

    private final JdbcTemplate jdbc;

    public AnalyticsController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
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
}
