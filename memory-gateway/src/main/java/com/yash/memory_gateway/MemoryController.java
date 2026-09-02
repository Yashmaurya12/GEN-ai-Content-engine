package com.yash.memory_gateway;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api")
public class MemoryController {

    private final String PYTHON_API_URL = "http://127.0.0.1:8000";
    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/add")
    public ResponseEntity<?> addMemory(@RequestBody Map<String, String> payload) {
        String url = PYTHON_API_URL + "/add_memory";
        ResponseEntity<Map> response = restTemplate.postForEntity(url, payload, Map.class);
        return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
    }

    @PostMapping("/search")
    public ResponseEntity<?> searchMemory(@RequestBody Map<String, String> payload) {
        String url = PYTHON_API_URL + "/search_memory";
        ResponseEntity<Map> response = restTemplate.postForEntity(url, payload, Map.class);
        return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
    }
}