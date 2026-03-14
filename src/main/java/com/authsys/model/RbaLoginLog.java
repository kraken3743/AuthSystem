package com.authsys.model;

import jakarta.persistence.*;

@Entity
@Table(name = "rba_login_logs")
public class RbaLoginLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;
    private String ipAddress;
    private boolean success;
    private java.time.LocalDateTime createdAt;
    private boolean isAttackIp; // maps to is_attack_ip in CSV

    // Getters and setters
    public Long getId() { return id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public java.time.LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(java.time.LocalDateTime createdAt) { this.createdAt = createdAt; }
    public boolean isAttackIp() { return isAttackIp; }
    public void setAttackIp(boolean isAttackIp) { this.isAttackIp = isAttackIp; }
}
