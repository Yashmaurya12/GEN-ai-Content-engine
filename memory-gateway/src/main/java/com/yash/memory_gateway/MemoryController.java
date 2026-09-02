package com.yash.memory_gateway;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.*;
import java.time.Duration;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api")
public class MemoryController {

    private final String pythonApiUrl;
    private final RestTemplate restTemplate;
    public MemoryController(@Value("${memory.api.url}") String url, RestTemplateBuilder builder,
            @Value("${memory.gateway.connect-timeout-ms}") long connect,
            @Value("${memory.gateway.read-timeout-ms}") long read) {
        pythonApiUrl = url;
        restTemplate = builder.setConnectTimeout(Duration.ofMillis(connect)).setReadTimeout(Duration.ofMillis(read)).build();
    }
    public record AddRequest(@NotBlank String text) {}
    public record SearchRequest(@NotBlank String question) {}

    @PostMapping("/add")
    public ResponseEntity<?> addMemory(@Valid @RequestBody AddRequest payload) {
        return proxy("/add_memory", payload);
    }

    @PostMapping("/search")
    public ResponseEntity<?> searchMemory(@Valid @RequestBody SearchRequest payload) {
        return proxy("/search_memory", payload);
    }
    private ResponseEntity<?> proxy(String path, Object body) {
        try { return restTemplate.postForEntity(pythonApiUrl + path, body, Map.class); }
        catch (ResourceAccessException e) { return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT).body(Map.of("error", "Memory service timeout or unavailable")); }
        catch (HttpStatusCodeException e) { return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", "Memory service rejected the request")); }
        catch (RestClientException e) { return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("error", "Memory service unavailable")); }
    }
}
