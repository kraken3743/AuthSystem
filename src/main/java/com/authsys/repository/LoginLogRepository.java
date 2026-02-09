package com.authsys.repository;

import com.authsys.model.LoginLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface LoginLogRepository extends JpaRepository<LoginLog, Long> {

    void deleteByUsername(String username);

    @Query("""
        SELECT l.username, COUNT(l)
        FROM LoginLog l
        WHERE l.success = false
        GROUP BY l.username
    """)
    List<Object[]> countFailedLoginsPerUser();

    @Query("""
        SELECT l.username, COUNT(l)
        FROM LoginLog l
        WHERE l.success = false
        AND l.createdAt >= CURRENT_TIMESTAMP - 1 HOUR
        GROUP BY l.username
    """)
    List<Object[]> failedLoginsLastHour();
}
