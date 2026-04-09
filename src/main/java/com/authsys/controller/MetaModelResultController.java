package com.authsys.controller;

import com.authsys.model.MetaModelResult;
import com.authsys.repository.MetaModelResultRepository;
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
@RequestMapping("/auth/analytics/meta-model")
public class MetaModelResultController {
    @Autowired
    private MetaModelResultRepository metaModelResultRepository;


    @GetMapping("/results")
    public ResponseEntity<Map<String, Object>> getAllResults(
            @PageableDefault(size = 10) Pageable pageable) {
        Page<MetaModelResult> page = metaModelResultRepository.findAll(pageable);
        Map<String, Object> response = new HashMap<>();
        response.put("content", page.getContent());
        response.put("totalElements", page.getTotalElements());
        response.put("totalPages", page.getTotalPages());
        response.put("pageNumber", page.getNumber());
        response.put("pageSize", page.getSize());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/results")
    public List<MetaModelResult> saveResults(@RequestBody List<MetaModelResult> results) {
        return metaModelResultRepository.saveAll(results);
    }
}
