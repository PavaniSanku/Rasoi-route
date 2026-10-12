package com.rasoiroute;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
  private final JdbcTemplate db;
  private final SecretKey signingKey;

  AuthService(
      JdbcTemplate db,
      @org.springframework.beans.factory.annotation.Value("${app.jwt-secret}") String secret) {
    this.db = db;
    if (secret.getBytes(StandardCharsets.UTF_8).length < 32)
      throw new IllegalArgumentException("JWT_SECRET must contain at least 32 bytes");
    this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
  }

  private SecretKey key() {
    return signingKey;
  }

  String issue(long id) {
    return Jwts.builder()
        .subject(Long.toString(id))
        .issuedAt(Date.from(Instant.now()))
        .expiration(Date.from(Instant.now().plusSeconds(3600)))
        .signWith(key())
        .compact();
  }

  long require(String header) {
    if (header == null || !header.startsWith("Bearer "))
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required");
    try {
      long id =
          Long.parseLong(
              Jwts.parser()
                  .verifyWith(key())
                  .build()
                  .parseSignedClaims(header.substring(7))
                  .getPayload()
                  .getSubject());
      if (db.queryForObject("select count(*) from users where id=?", Integer.class, id) == 0)
        throw new IllegalArgumentException();
      return id;
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired token");
    }
  }
}
