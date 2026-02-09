package com.authsys.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "cert_login_logs")
public class CertLoginLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cert_event_id")
    private String certEventId;

    @Column(name = "event_time")
    private LocalDateTime eventTime;

    private String username;
    private String pc;
    private String activity;

    // getters & setters
}
