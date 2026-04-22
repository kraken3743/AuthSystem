package com.authsys.controller;

import com.authsys.model.UnsupervisedModelResult;
import com.authsys.repository.UnsupervisedModelResultRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth/analytics/unsupervised-model")
public class UnsupervisedModelResultController {
    @Autowired
    private UnsupervisedModelResultRepository unsupervisedModelResultRepository;

    @GetMapping("/results")
    public ResponseEntity<Map<String, Object>> getAllResults(
            @PageableDefault(size = 10) Pageable pageable) {
        Page<UnsupervisedModelResult> page = unsupervisedModelResultRepository.findAll(pageable);
        Map<String, Object> response = new HashMap<>();
        response.put("content", page.getContent());
        response.put("totalElements", page.getTotalElements());
        response.put("totalPages", page.getTotalPages());
        response.put("pageNumber", page.getNumber());
        response.put("pageSize", page.getSize());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/results")
    public List<UnsupervisedModelResult> saveResults(@RequestBody List<UnsupervisedModelResult> results) {
        unsupervisedModelResultRepository.deleteAll(); // clear old results to avoid duplicates
        return unsupervisedModelResultRepository.saveAll(results);
    }
}
