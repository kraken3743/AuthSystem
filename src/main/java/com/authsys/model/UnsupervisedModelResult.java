package com.authsys.model;

import jakarta.persistence.*;

@Entity
@Table(name = "unsupervised_model_results")
public class UnsupervisedModelResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "iso_pred") // 1 for attack, 0 for normal
    private Integer isoPred;

    @Column(name = "lof_pred") // 1 for attack, 0 for normal
    private Integer lofPred;

    @Column(name = "is_attack_ip")
    private Integer isAttackIp;

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public Integer getIsoPred() { return isoPred; }
    public void setIsoPred(Integer isoPred) { this.isoPred = isoPred; }
    public Integer getLofPred() { return lofPred; }
    public void setLofPred(Integer lofPred) { this.lofPred = lofPred; }
    public Integer getIsAttackIp() { return isAttackIp; }
    public void setIsAttackIp(Integer isAttackIp) { this.isAttackIp = isAttackIp; }
}
