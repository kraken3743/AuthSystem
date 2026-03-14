package com.authsys.repository;

import com.authsys.model.RbaLoginLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface RbaLoginLogRepository extends JpaRepository<RbaLoginLog, Long> {
    @Query("""
        SELECT r.username, COUNT(r)
        FROM RbaLoginLog r
        WHERE r.success = false
        GROUP BY r.username
    """)
    List<Object[]> countFailedLoginsPerUser();

    @Query("""
        SELECT r.username, COUNT(r)
        FROM RbaLoginLog r
        WHERE r.success = false
        AND r.createdAt >= CURRENT_TIMESTAMP - 1 HOUR
        GROUP BY r.username
    """)
    List<Object[]> failedLoginsLastHour();

    @Query("SELECT r.isAttackIp FROM RbaLoginLog r")
    List<Boolean> getAllAttackLabels();
}
