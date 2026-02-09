package com.authsys.repository;

import com.authsys.dto.LoginStats;
import com.authsys.dto.TimeWindowStats;
import com.authsys.model.CertLoginLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CertLoginLogRepository extends JpaRepository<CertLoginLog, Long> {

    // Failed login count per user
    @Query("""
        SELECT new com.authsys.dto.LoginStats(
            c.username,
            COUNT(c)
        )
        FROM CertLoginLog c
        WHERE c.activity = 'Logon'
        GROUP BY c.username
    """)
    List<LoginStats> countLogonsPerUser();

    // Time window IDS (last 1 hour)
    @Query("""
    SELECT new com.authsys.dto.TimeWindowStats(
        c.username,
        COUNT(c)
    )
    FROM CertLoginLog c
    WHERE c.eventTime >= (
        SELECT MAX(x.eventTime) FROM CertLoginLog x
    ) - 1 HOUR
    GROUP BY c.username
""")
List<TimeWindowStats> logonsLastHour();


}
