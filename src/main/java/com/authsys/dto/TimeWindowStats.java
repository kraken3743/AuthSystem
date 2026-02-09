package com.authsys.dto;

public class TimeWindowStats {

    private String username;
    private long failedLoginsLastHour;
    private boolean anomalous;

    public TimeWindowStats(String username, long failedLoginsLastHour) {
        this.username = username;
        this.failedLoginsLastHour = failedLoginsLastHour;
        this.anomalous = false;
    }

    public TimeWindowStats(String username, long failedLoginsLastHour, boolean anomalous) {
        this.username = username;
        this.failedLoginsLastHour = failedLoginsLastHour;
        this.anomalous = anomalous;
    }

    public String getUsername() {
        return username;
    }

    public long getFailedLoginsLastHour() {
        return failedLoginsLastHour;
    }

    public boolean isAnomalous() {
        return anomalous;
    }
}
