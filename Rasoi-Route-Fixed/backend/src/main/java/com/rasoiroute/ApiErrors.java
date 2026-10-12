package com.rasoiroute;

import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiErrors {
  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<?> handled(ResponseStatusException e) {
    return ResponseEntity.status(e.getStatusCode())
        .body(Map.of("detail", e.getReason() == null ? "Request failed" : e.getReason()));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  ResponseEntity<?> malformed() {
    return ResponseEntity.badRequest().body(Map.of("detail", "Invalid JSON request"));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<?> conflict() {
    return ResponseEntity.status(409)
        .body(Map.of("detail", "This record already exists or conflicts with an existing request"));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<?> unexpected(Exception e) {
    org.slf4j.LoggerFactory.getLogger(ApiErrors.class).error("Unexpected API failure", e);
    return ResponseEntity.status(500)
        .body(Map.of("detail", "The request could not be completed. Please retry."));
  }
}
