package com.authsys.service;

import com.authsys.dto.AnomalyResult;
import com.authsys.dto.LoginStats;
import com.authsys.dto.TimeWindowStats;
import com.authsys.model.LoginLog;
import com.authsys.model.User;
import com.authsys.privacy.DifferentialPrivacyUtil;
import com.authsys.repository.CertLoginLogRepository;
import com.authsys.repository.LoginLogRepository;
import com.authsys.repository.UserRepository;
import jakarta.transaction.Transactional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final LoginLogRepository loginLogRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository,
                       LoginLogRepository loginLogRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.loginLogRepository = loginLogRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ---------------- REGISTER ----------------
    public User registerUser(String username, String email, String rawPassword) {

        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username already exists");
        }

        User user = new User();
        user.setUsername(username.trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));

        if (userRepository.count() == 0) {
            user.setRole("ADMIN");
        } else {
            user.setRole("USER");
        }

        return userRepository.save(user);
    }

    // ---------------- LOGIN (ALWAYS LOG ATTEMPTS) ----------------
    public String loginAndGetRole(String username, String rawPassword, String ipAddress) {

        LoginLog log = new LoginLog();
        log.setUsername(username);
        log.setIpAddress(ipAddress != null ? ipAddress : "UNKNOWN");

        var userOpt = userRepository.findByUsername(username);

        if (userOpt.isPresent() &&
            passwordEncoder.matches(rawPassword, userOpt.get().getPasswordHash())) {

            log.setSuccess(true);
            loginLogRepository.save(log);
            return userOpt.get().getRole();
        }

        // ❗ always log failed attempts
        log.setSuccess(false);
        loginLogRepository.save(log);
        return "INVALID";
    }

    // ---------------- DP AGGREGATION ----------------
    public List<LoginStats> getPrivateFailedLoginStats(double epsilon) {
        return loginLogRepository.countFailedLoginsPerUser()
                .stream()
                .map(row -> new LoginStats(
                        (String) row[0],
                        Math.round(
                                DifferentialPrivacyUtil.addLaplaceNoise(
                                        ((Long) row[1]), epsilon
                                )
                        )
                ))
                .toList();
    }

    // ---------------- THRESHOLD ANOMALY ----------------
    public List<AnomalyResult> detectLoginAnomalies(double epsilon, long threshold) {
        return loginLogRepository.countFailedLoginsPerUser()
                .stream()
                .map(row -> {
                    long noisy = Math.round(
                            DifferentialPrivacyUtil.addLaplaceNoise(
                                    ((Long) row[1]), epsilon
                            )
                    );
                    return new AnomalyResult(
                            (String) row[0],
                            noisy,
                            noisy >= threshold
                    );
                })
                .toList();
    }

    // ---------------- TIME WINDOW IDS ----------------
    public List<TimeWindowStats> detectTimeWindowAnomalies(double epsilon, long threshold) {
        return loginLogRepository.failedLoginsLastHour()
                .stream()
                .map(row -> {
                    long noisy = Math.round(
                            DifferentialPrivacyUtil.addLaplaceNoise(
                                    ((Long) row[1]), epsilon
                            )
                    );
                    return new TimeWindowStats(
                            (String) row[0],
                            noisy,
                            noisy >= threshold
                    );
                })
                .toList();
    }

    // ---------------- ADMIN: USERS ----------------
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Transactional
    public void deleteUser(String username) {
    if ("admin".equals(username)) {
        throw new RuntimeException("Cannot delete admin");
    }
    userRepository.deleteByUsername(username);
}


    @Transactional
    public void updateUserRole(String username, String role) {
        User user = userRepository.findByUsername(username)
                .orElseThrow();
        user.setRole(role);
        userRepository.save(user);
    }

    @Autowired
private CertLoginLogRepository certRepo;

// ---------------- CERT DP AGGREGATION ----------------
public List<LoginStats> getCertPrivateLogins(double epsilon) {
    return certRepo.countLogonsPerUser()
            .stream()
            .map(stat -> new LoginStats(
                    stat.getUsername(),
                    Math.round(
                        DifferentialPrivacyUtil.addLaplaceNoise(
                            stat.getLoginCount(), epsilon
                        )
                    )
            ))
            .toList();
}

// ---------------- CERT TIME WINDOW IDS ----------------
public List<TimeWindowStats> getCertTimeWindow(double epsilon, long threshold) {
    return certRepo.logonsLastHour()
            .stream()
            .map(stat -> {
                long noisy = Math.round(
                    DifferentialPrivacyUtil.addLaplaceNoise(
                        stat.getFailedLoginsLastHour(), epsilon
                    )
                );
                return new TimeWindowStats(
                        stat.getUsername(),
                        noisy,
                        noisy >= threshold
                );
            })
            .toList();
}

public List<AnomalyResult> detectCertAnomalies(double epsilon, long threshold) {

    return certRepo.countLogonsPerUser()
            .stream()
            .map(stat -> {
                long noisy = Math.round(
                        DifferentialPrivacyUtil.addLaplaceNoise(
                                stat.getLoginCount(), epsilon
                        )
                );

                return new AnomalyResult(
                        stat.getUsername(),
                        noisy,
                        noisy >= threshold
                );
            })
            .toList();
}


    
}
