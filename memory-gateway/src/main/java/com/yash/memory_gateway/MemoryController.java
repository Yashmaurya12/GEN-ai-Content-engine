package com.yash.memory_gateway;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.*;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.security.MessageDigest;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class MemoryController {

    private final String pythonApiUrl;
    private final String gatewayToken;
    private final RestTemplate restTemplate;
    public MemoryController(@Value("${memory.api.url}") String url, RestTemplateBuilder builder,
            @Value("${memory.gateway.connect-timeout-ms}") long connect,
            @Value("${memory.gateway.read-timeout-ms}") long read,
            @Value("${memory.gateway.token:}") String token) {
        pythonApiUrl = url;
        gatewayToken = token;
        restTemplate = builder.setConnectTimeout(Duration.ofMillis(connect)).setReadTimeout(Duration.ofMillis(read)).build();
    }
    public record AddRequest(@NotBlank String text) {}
    public record SearchRequest(@NotBlank String question) {}

    @PostMapping("/add")
    public ResponseEntity<?> addMemory(@Valid @RequestBody AddRequest payload,
            @RequestHeader(value = "X-Memory-Gateway-Token", required = false) String token) {
        requireToken(token);
        return proxy("/add_memory", payload);
    }

    @PostMapping("/search")
    public ResponseEntity<?> searchMemory(@Valid @RequestBody SearchRequest payload,
            @RequestHeader(value = "X-Memory-Gateway-Token", required = false) String token) {
        requireToken(token);
        return proxy("/search_memory", payload);
    }
    private void requireToken(String supplied) {
        if (gatewayToken.isBlank() || supplied == null ||
                !MessageDigest.isEqual(supplied.getBytes(StandardCharsets.UTF_8), gatewayToken.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Memory gateway authentication required");
        }
    }
    private ResponseEntity<?> proxy(String path, Object body) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Memory-Gateway-Token", gatewayToken);
            return restTemplate.postForEntity(pythonApiUrl + path, new HttpEntity<>(body, headers), Map.class);
        }
        catch (ResourceAccessException e) { return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT).body(Map.of("error", "Memory service timeout or unavailable")); }
        catch (HttpStatusCodeException e) { return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", "Memory service rejected the request")); }
        catch (RestClientException e) { return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("error", "Memory service unavailable")); }
    }
}
