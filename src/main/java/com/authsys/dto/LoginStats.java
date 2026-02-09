package com.authsys.dto;

public class LoginStats {

    private String username;
    private long loginCount;

    public LoginStats(String username, long loginCount) {
        this.username = username;
        this.loginCount = loginCount;
    }

    public String getUsername() {
        return username;
    }

    public long getLoginCount() {
        return loginCount;
    }
}
