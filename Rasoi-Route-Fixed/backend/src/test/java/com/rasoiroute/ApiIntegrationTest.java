package com.rasoiroute;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:tests;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
      "spring.datasource.driver-class-name=org.h2.Driver",
      "spring.datasource.username=sa",
      "spring.datasource.password=",
      "app.jwt-secret=test-only-signing-secret-at-least-32-characters",
      "spring.mail.host=localhost"
    })
@AutoConfigureMockMvc
class ApiIntegrationTest {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper mapper;
  @Autowired BillingService billing;
  @MockBean RazorpayService gateway;
  @MockBean MailService mail;

  String register() throws Exception {
    String email = UUID.randomUUID() + "@example.com";
    String json =
        mvc.perform(
                post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        mapper.writeValueAsString(
                            Map.of(
                                "name",
                                "Demo User",
                                "email",
                                email,
                                "password",
                                "secure-test-password"))))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return mapper.readTree(json).path("access_token").asText();
  }

  ObjectNode request(String method) {
    ObjectNode body = mapper.createObjectNode();
    body.putArray("items").addObject().put("itemId", "chicken-biryani").put("quantity", 2);
    body.put("coupon", "WELCOME50");
    body.put("deliveryTier", "priority");
    body.put("ecoPackaging", true);
    body.put("noCutlery", true);
    body.put("riderTip", 30);
    body.put("paymentMethod", method);
    body.put("customerName", "Demo User");
    body.put("customerPhone", "9876543210");
    body.put("customerAddress", "Door 12, Main Road, Palakol 534260");
    return body;
  }

  JsonNode create(String token, ObjectNode body, String key) throws Exception {
    return mapper.readTree(
        mvc.perform(
                post("/api/orders")
                    .header("Authorization", "Bearer " + token)
                    .header("Idempotency-Key", key)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body.toString()))
            .andExpect(status().is2xxSuccessful())
            .andReturn()
            .getResponse()
            .getContentAsString());
  }

  @Test
  void registerLoginAndProtectedOrders() throws Exception {
    String token = register();
    mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("name").value("Demo User"));
    mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    mvc.perform(
            post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(request("COD").toString()))
        .andExpect(status().isUnauthorized());
    mvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"unknown@example.com\",\"password\":\"wrong-password\"}"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void serverBillIgnoresClientPricesAndHasExactTotal() throws Exception {
    var body = request("COD");
    body.path("items").get(0).deepCopy();
    ((ObjectNode) body.path("items").get(0)).put("price", 1);
    body.put("total", 1);
    var bill = create(register(), body, UUID.randomUUID().toString());
    assertEquals(498, bill.path("subtotal").asDouble());
    assertEquals(50, bill.path("discount").asDouble());
    assertEquals(55, bill.path("deliveryFee").asDouble());
    assertEquals(26.16, bill.path("gst").asDouble());
    assertEquals(579.16, bill.path("grandTotal").asDouble());
    assertEquals("DUE", bill.path("paymentStatus").asText());
    assertEquals("Demo User", bill.path("customerName").asText());
  }

  @Test
  void orderOwnershipAndRetrySafety() throws Exception {
    String token = register(), other = register(), key = UUID.randomUUID().toString();
    var input = request("COD");
    var first = create(token, input, key);
    var second = create(token, input, key);
    assertEquals(first.path("orderId"), second.path("orderId"));
    String id = first.path("orderId").asText();
    mvc.perform(post("/api/orders/" + id + "/bill")).andExpect(status().isUnauthorized());
    mvc.perform(post("/api/orders/" + id + "/bill").header("Authorization", "Bearer " + other))
        .andExpect(status().isNotFound());
    mvc.perform(
            post("/api/orders/" + id + "/coupon")
                .header("Authorization", "Bearer " + other)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"coupon\":\"SAVE10\"}"))
        .andExpect(status().isNotFound());
    input.put("riderTip", 50);
    mvc.perform(
            post("/api/orders")
                .header("Authorization", "Bearer " + token)
                .header("Idempotency-Key", key)
                .contentType(MediaType.APPLICATION_JSON)
                .content(input.toString()))
        .andExpect(status().isConflict());
  }

  @Test
  void validatesInputsAndRejectsChangedTotals() throws Exception {
    String token = register();
    var input = request("COD");
    input.put("expectedTotal", 1);
    mvc.perform(
            post("/api/orders")
                .header("Authorization", "Bearer " + token)
                .header("Idempotency-Key", UUID.randomUUID())
                .contentType(MediaType.APPLICATION_JSON)
                .content(input.toString()))
        .andExpect(status().isConflict());
    input.remove("expectedTotal");
    input.put("customerPhone", "123");
    mvc.perform(
            post("/api/orders")
                .header("Authorization", "Bearer " + token)
                .header("Idempotency-Key", UUID.randomUUID())
                .contentType(MediaType.APPLICATION_JSON)
                .content(input.toString()))
        .andExpect(status().isUnprocessableEntity());
    input = request("COD");
    ((ObjectNode) input.path("items").get(0)).put("quantity", 1.5);
    mvc.perform(
            post("/api/orders/calculate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(input.toString()))
        .andExpect(status().isUnprocessableEntity());
  }

  @Test
  void paymentVerificationAndWebhookUseSignaturesAndCapturedAmount() throws Exception {
    String token = register();
    var order = create(token, request("UPI"), UUID.randomUUID().toString());
    String id = order.path("orderId").asText();
    when(gateway.keyId()).thenReturn("rzp_test_mock");
    when(gateway.keySecret()).thenReturn("mock-secret");
    when(gateway.webhookSecret()).thenReturn("mock-webhook");
    when(gateway.request(eq("POST"), eq("orders"), any()))
        .thenReturn(mapper.readTree("{\"id\":\"order_" + id + "\"}"));
    String paymentOrder = "order_" + id;
    String payment = "pay_" + id;
    mvc.perform(
            post("/api/payments/create")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("order_id", id))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("amount").value(57916));
    mvc.perform(
            post("/api/orders/" + id + "/coupon")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"coupon\":\"SAVE10\"}"))
        .andExpect(status().isConflict());
    var verify =
        Map.of(
            "razorpay_order_id",
            paymentOrder,
            "razorpay_payment_id",
            payment,
            "razorpay_signature",
            "invalid");
    mvc.perform(
            post("/api/payments/verify")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(verify)))
        .andExpect(status().isBadRequest());
    when(gateway.request(eq("GET"), anyString(), isNull()))
        .thenReturn(
            mapper.readTree(
                mapper.writeValueAsString(
                    Map.of(
                        "order_id",
                        paymentOrder,
                        "status",
                        "captured",
                        "currency",
                        "INR",
                        "amount",
                        57916))));
    var valid =
        Map.of(
            "razorpay_order_id",
            paymentOrder,
            "razorpay_payment_id",
            payment,
            "razorpay_signature",
            sign(paymentOrder + "|" + payment, "mock-secret"));
    mvc.perform(
            post("/api/payments/verify")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(valid)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("bill.paymentStatus").value("PAID"));
    mvc.perform(
            post("/api/payments/verify")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(valid)))
        .andExpect(status().isOk());
    verify(mail, times(1)).send(anyString(), eq("Rasoi Route payment confirmed"), anyString());
    String event =
        "{\"event\":\"payment.captured\",\"payload\":{\"payment\":{\"entity\":{\"order_id\":\""
            + paymentOrder
            + "\",\"id\":\""
            + payment
            + "\",\"status\":\"captured\",\"currency\":\"INR\",\"amount\":57916}}}}";
    mvc.perform(
            post("/api/payments/webhook").contentType(MediaType.APPLICATION_JSON).content(event))
        .andExpect(status().isBadRequest());
    mvc.perform(
            post("/api/payments/webhook")
                .header("X-Razorpay-Signature", sign(event, "mock-webhook"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(event))
        .andExpect(status().isOk());
    verify(mail, times(1)).send(anyString(), eq("Rasoi Route payment confirmed"), anyString());
  }

  @Test
  void codDoesNotStartAnOnlinePayment() throws Exception {
    String token = register();
    String id =
        create(token, request("COD"), UUID.randomUUID().toString()).path("orderId").asText();
    mvc.perform(
            post("/api/payments/create")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("order_id", id))))
        .andExpect(status().isConflict());
  }

  @Test
  void corsAllowsDeclaredFrontendAndRejectsOtherOrigins() throws Exception {
    mvc.perform(
            options("/api/orders")
                .header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "Authorization,Idempotency-Key"))
        .andExpect(status().isOk())
        .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    mvc.perform(
            options("/api/orders")
                .header("Origin", "https://untrusted.example")
                .header("Access-Control-Request-Method", "POST"))
        .andExpect(status().isForbidden());
  }

  static String sign(String value, String secret) throws Exception {
    var mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
  }
}
