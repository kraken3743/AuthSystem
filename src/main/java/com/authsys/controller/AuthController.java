package com.authsys.controller;

import com.authsys.model.User;
import com.authsys.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // ---------- REGISTER ----------
    @PostMapping("/register")
    public User register(@RequestParam String username,
                         @RequestParam String email,
                         @RequestParam String password) {
        return authService.registerUser(username, email, password);
    }

    // ---------- LOGIN ----------
    @PostMapping("/login")
    public String login(@RequestParam String username,
                        @RequestParam String password,
                        HttpServletRequest request) {

        String ip = request.getRemoteAddr();
        return authService.loginAndGetRole(username, password, ip);
    }

}
