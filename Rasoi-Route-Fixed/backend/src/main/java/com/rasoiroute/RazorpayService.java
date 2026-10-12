package com.rasoiroute;

import com.fasterxml.jackson.databind.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RazorpayService {
  private final ObjectMapper mapper;
  private final String keyId, secret, webhook;
  private final HttpClient client =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

  public RazorpayService(
      ObjectMapper mapper,
      @Value("${app.razorpay.key-id:}") String keyId,
      @Value("${app.razorpay.key-secret:}") String secret,
      @Value("${app.razorpay.webhook-secret:}") String webhook) {
    this.mapper = mapper;
    this.keyId = keyId;
    this.secret = secret;
    this.webhook = webhook;
  }

  private String required(String value) {
    if (value == null || value.isBlank())
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE,
          "Payment provider is not configured. Use cash on delivery or configure Razorpay test"
              + " keys.");
    return value;
  }

  public String keyId() {
    return required(keyId);
  }

  public String keySecret() {
    return required(secret);
  }

  public String webhookSecret() {
    return required(webhook);
  }

  public JsonNode request(String method, String path, Object payload) {
    try {
      String credentials =
          Base64.getEncoder()
              .encodeToString((keyId() + ":" + keySecret()).getBytes(StandardCharsets.UTF_8));
      HttpRequest.Builder request =
          HttpRequest.newBuilder(URI.create("https://api.razorpay.com/v1/" + path))
              .timeout(Duration.ofSeconds(20))
              .header("Authorization", "Basic " + credentials)
              .header("Content-Type", "application/json");
      if (method.equals("POST"))
        request.POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(payload)));
      else request.GET();
      var response = client.send(request.build(), HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() / 100 != 2)
        throw new ResponseStatusException(
            HttpStatus.BAD_GATEWAY, "Payment provider rejected the request. Please retry.");
      return mapper.readTree(response.body());
    } catch (ResponseStatusException e) {
      throw e;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Payment request interrupted");
    } catch (Exception e) {
      throw new ResponseStatusException(
          HttpStatus.BAD_GATEWAY, "Payment provider unavailable. Please retry.");
    }
  }
}
