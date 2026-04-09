package com.authsys.model;

import jakarta.persistence.*;

@Entity
@Table(name = "meta_model_results")
public class MetaModelResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "failed_count")
    private Integer failedCount;

    @Column(name = "login_freq")
    private Integer loginFreq;

    @Column(name = "unique_ips")
    private Integer uniqueIps;

    @Column(name = "avg_rtt")
    private Double avgRtt;

    @Column(name = "meta_prob")
    private Double metaProb;

    @Column(name = "meta_pred")
    private Integer metaPred;

    @Column(name = "is_attack_ip")
    private Integer isAttackIp;

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public Integer getFailedCount() { return failedCount; }
    public void setFailedCount(Integer failedCount) { this.failedCount = failedCount; }
    public Integer getLoginFreq() { return loginFreq; }
    public void setLoginFreq(Integer loginFreq) { this.loginFreq = loginFreq; }
    public Integer getUniqueIps() { return uniqueIps; }
    public void setUniqueIps(Integer uniqueIps) { this.uniqueIps = uniqueIps; }
    public Double getAvgRtt() { return avgRtt; }
    public void setAvgRtt(Double avgRtt) { this.avgRtt = avgRtt; }
    public Double getMetaProb() { return metaProb; }
    public void setMetaProb(Double metaProb) { this.metaProb = metaProb; }
    public Integer getMetaPred() { return metaPred; }
    public void setMetaPred(Integer metaPred) { this.metaPred = metaPred; }
    public Integer getIsAttackIp() { return isAttackIp; }
    public void setIsAttackIp(Integer isAttackIp) { this.isAttackIp = isAttackIp; }
}
