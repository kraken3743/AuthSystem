package com.authsys.dto;

public class AnomalyResult {

    private String username;
    private long noisyFailedLogins;
    private boolean anomalous;

    public AnomalyResult(String username, long noisyFailedLogins, boolean anomalous) {
        this.username = username;
        this.noisyFailedLogins = noisyFailedLogins;
        this.anomalous = anomalous;
    }

    public String getUsername() {
        return username;
    }

    public long getNoisyFailedLogins() {
        return noisyFailedLogins;
    }

    public boolean isAnomalous() {
        return anomalous;
    }
}
