package com.authsys.controller;

import com.authsys.service.AuthService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth/analytics/cert")
@CrossOrigin
public class CertAnalyticsController {

    private final AuthService authService;

    public CertAnalyticsController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/failed-logins")
    public Object certFailedLogins(@RequestParam double epsilon) {
        return authService.getCertPrivateLogins(epsilon);
    }

    @GetMapping("/time-window")
    public Object certTimeWindow(
            @RequestParam double epsilon,
            @RequestParam long threshold
    ) {
        return authService.getCertTimeWindow(epsilon, threshold);
    }
    @GetMapping("/anomalies")
public Object certAnomalies(
        @RequestParam double epsilon,
        @RequestParam long threshold
) {
    return authService.detectCertAnomalies(epsilon, threshold);
}

}
