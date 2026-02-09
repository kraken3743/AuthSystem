package com.authsys.controller;

import com.authsys.model.User;
import com.authsys.repository.UserRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/auth/admin")
public class AdminController {

    private final UserRepository repo;

    public AdminController(UserRepository repo) {
        this.repo = repo;
    }

    @GetMapping("/users")
    public List<User> users() {
        return repo.findAll();
    }

    @PostMapping("/change-role")
    public void changeRole(@RequestParam String username,
                           @RequestParam String role) {
        repo.findByUsername(username).ifPresent(u -> {
            u.setRole(role);
            repo.save(u);
        });
    }

    @DeleteMapping("/delete-user")
    public void deleteUser(@RequestParam String username) {
        repo.findByUsername(username)
            .ifPresent(repo::delete);
    }
}
