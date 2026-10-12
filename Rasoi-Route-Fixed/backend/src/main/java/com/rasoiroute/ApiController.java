package com.rasoiroute;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.*;
import org.springframework.jdbc.core.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class ApiController {
  private final JdbcTemplate db;
  private final AuthService auth;
  private final PasswordEncoder encoder;
  private final MailService mail;
  private final MenuService menu;
  private final ObjectMapper mapper;
  private final BillingService billing;
  private final RazorpayService gateway;

  ApiController(
      JdbcTemplate db,
      AuthService auth,
      PasswordEncoder encoder,
      MailService mail,
      MenuService menu,
      ObjectMapper mapper,
      BillingService billing,
      RazorpayService gateway) {
    this.db = db;
    this.auth = auth;
    this.encoder = encoder;
    this.mail = mail;
    this.menu = menu;
    this.mapper = mapper;
    this.billing = billing;
    this.gateway = gateway;
  }

  private ResponseStatusException err(HttpStatus s, String m) {
    return new ResponseStatusException(s, m);
  }

  private String value(Map<String, String> data, String key) {
    return Objects.toString(data.get(key), "");
  }

  private String env(String k) {
    String s = System.getenv(k);
    if (s == null || s.isBlank()) throw err(HttpStatus.SERVICE_UNAVAILABLE, "Missing " + k);
    return s;
  }

  private Map<String, Object> user(long id) {
    return db.queryForMap("select id,name,email from users where id=?", id);
  }

  @GetMapping({"/health", "/healthz"})
  public Map<String, String> health() {
    return Map.of("status", "ok");
  }

  @GetMapping("/menu")
  public Object menu() {
    return menu.all();
  }

  @PostMapping("/auth/register")
  @org.springframework.transaction.annotation.Transactional
  public ResponseEntity<?> register(@RequestBody Map<String, String> data) {
    String name = value(data, "name").trim(),
        email = value(data, "email").trim().toLowerCase(),
        password = value(data, "password");
    if (name.length() < 2
        || name.length() > 100
        || email.length() > 254
        || !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")
        || password.length() < 8
        || password.getBytes(StandardCharsets.UTF_8).length > 72)
      throw err(
          HttpStatus.UNPROCESSABLE_ENTITY, "Valid name, email and 8+ character password required");
    if (db.queryForObject("select count(*) from users where email=?", Integer.class, email) > 0)
      throw err(HttpStatus.CONFLICT, "Email already registered");
    org.springframework.jdbc.support.GeneratedKeyHolder generated =
        new org.springframework.jdbc.support.GeneratedKeyHolder();
    String passwordHash = encoder.encode(password);
    db.update(
        connection -> {
          var statement =
              connection.prepareStatement(
                  "insert into users(name,email,password_hash) values(?,?,?)", new String[] {"id"});
          statement.setString(1, name);
          statement.setString(2, email);
          statement.setString(3, passwordHash);
          return statement;
        },
        generated);
    long id = Objects.requireNonNull(generated.getKey()).longValue();
    mail.send(
        email,
        "Welcome to Rasoi Route",
        "Hello " + name + ", your account was created successfully.");
    return ResponseEntity.status(201)
        .body(Map.of("access_token", auth.issue(id), "token_type", "bearer", "user", user(id)));
  }

  @PostMapping("/auth/login")
  public Object login(@RequestBody Map<String, String> data) {
    if (value(data, "password").getBytes(StandardCharsets.UTF_8).length > 72)
      throw err(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    var found =
        db.queryForList(
            "select id,password_hash from users where email=?",
            value(data, "email").trim().toLowerCase());
    if (found.isEmpty()
        || !encoder.matches(value(data, "password"), found.get(0).get("password_hash").toString()))
      throw err(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    long id = ((Number) found.get(0).get("id")).longValue();
    return Map.of("access_token", auth.issue(id), "token_type", "bearer", "user", user(id));
  }

  @GetMapping("/auth/me")
  public Object me(@RequestHeader(value = "Authorization", required = false) String h) {
    return user(auth.require(h));
  }

  private BigDecimal money(Object o) {
    return new BigDecimal(o.toString()).setScale(2, RoundingMode.HALF_UP);
  }

  private Map<String, Object> bill(JsonNode input, String orderId, String createdAt) {
    return billing.calculate(input, orderId, createdAt);
  }

  private void owned(String id, long uid) {
    if (db.queryForList("select order_id from orders where order_id=? and user_id=?", id, uid)
        .isEmpty()) throw err(HttpStatus.NOT_FOUND, "Your order not found");
  }

  @PostMapping("/orders/calculate")
  public Object calculate(@RequestBody JsonNode input) {
    return bill(
        input,
        "ORD-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase(),
        Instant.now().toString());
  }

  @PostMapping("/orders")
  @org.springframework.transaction.annotation.Transactional
  public ResponseEntity<?> create(
      @RequestBody JsonNode input,
      @RequestHeader(value = "Authorization", required = false) String h,
      @RequestHeader(value = "Idempotency-Key", required = false) String retry)
      throws Exception {
    long uid = auth.require(h);
    if (retry == null || !retry.matches("[a-zA-Z0-9-]{16,80}"))
      throw err(HttpStatus.UNPROCESSABLE_ENTITY, "Valid Idempotency-Key required");
    db.queryForObject("select id from users where id=? for update", Long.class, uid);
    var prior =
        db.queryForList(
            "select order_id,request_json from orders where user_id=? and idempotency_key=?",
            uid,
            retry);
    if (!prior.isEmpty()) {
      if (!mapper.readTree(prior.get(0).get("request_json").toString()).equals(input))
        throw err(HttpStatus.CONFLICT, "Retry key was already used for a different order");
      return ResponseEntity.ok(stored(prior.get(0).get("order_id").toString()));
    }
    var result =
        bill(input, "ORD-" + UUID.randomUUID().toString().toUpperCase(), Instant.now().toString());
    billing.validateCustomer(result);
    if (input.has("expectedTotal")
        && (!input.path("expectedTotal").isNumber()
            || money(input.get("expectedTotal").asText()).compareTo(money(result.get("grandTotal")))
                != 0))
      throw err(HttpStatus.CONFLICT, "Your bill changed. Review the latest total and retry.");
    db.update(
        "insert into orders(order_id,user_id,request_json,bill_json,idempotency_key,payment_method)"
            + " values(?,?,?,?,?,?)",
        result.get("orderId"),
        uid,
        mapper.writeValueAsString(input),
        mapper.writeValueAsString(result),
        retry,
        result.get("paymentMethod"));
    return ResponseEntity.status(201).body(result);
  }

  @GetMapping("/orders")
  public Object history(@RequestHeader(value = "Authorization", required = false) String h) {
    long uid = auth.require(h);
    return db
        .queryForList(
            "select order_id from orders where user_id=? order by created_at desc limit 100", uid)
        .stream()
        .map(r -> stored(r.get("order_id").toString()))
        .toList();
  }

  private Map<String, Object> stored(String id) {
    var rows = db.queryForList("select bill_json from orders where order_id=?", id);
    if (rows.isEmpty()) throw err(HttpStatus.NOT_FOUND, "Order not found");
    try {
      Map<String, Object> result =
          mapper.readValue(rows.get(0).get("bill_json").toString(), Map.class);
      var payments = db.queryForList("select status from payments where order_id=?", id);
      if (!payments.isEmpty())
        result.put(
            "paymentStatus", payments.get(0).get("status").equals("PAID") ? "PAID" : "PENDING");
      return result;
    } catch (Exception e) {
      throw err(HttpStatus.INTERNAL_SERVER_ERROR, "Invalid saved bill");
    }
  }

  @PostMapping("/orders/{id}/bill")
  public Object saved(
      @PathVariable String id, @RequestHeader(value = "Authorization", required = false) String h) {
    owned(id, auth.require(h));
    return stored(id);
  }

  @PostMapping("/orders/{id}/coupon")
  @org.springframework.transaction.annotation.Transactional
  public Object coupon(
      @PathVariable String id,
      @RequestBody Map<String, String> data,
      @RequestHeader(value = "Authorization", required = false) String h)
      throws Exception {
    owned(id, auth.require(h));
    db.queryForObject("select order_id from orders where order_id=? for update", String.class, id);
    var rows = db.queryForList("select request_json,bill_json from orders where order_id=?", id);
    if (rows.isEmpty()) throw err(HttpStatus.NOT_FOUND, "Order not found");
    ObjectNode input = (ObjectNode) mapper.readTree(rows.get(0).get("request_json").toString());
    input.put("coupon", value(data, "coupon"));
    Map<String, Object> old = stored(id),
        updated = bill(input, id, old.get("createdAt").toString());
    if (db.queryForObject("select count(*) from payments where order_id=?", Integer.class, id) > 0)
      throw err(HttpStatus.CONFLICT, "Cannot change order after payment started");
    db.update(
        "update orders set request_json=?,bill_json=? where order_id=?",
        mapper.writeValueAsString(input),
        mapper.writeValueAsString(updated),
        id);
    return updated;
  }

  @GetMapping("/delivery/availability")
  public Object delivery(@RequestParam String postalCode) {
    if (!postalCode.matches("\\d{6}"))
      throw err(HttpStatus.UNPROCESSABLE_ENTITY, "6-digit postal code required");
    return Map.of(
        "postalCode",
        postalCode,
        "available",
        true,
        "estimatedMinutes",
        35,
        "checksCompleted",
        2,
        "detail",
        "Demo delivery availability only; no delivery provider connected.");
  }

  @GetMapping("/performance/benchmark")
  public Object benchmark() {
    return Map.of(
        "measurements",
        List.of(
            Map.of("itemCount", 10, "elapsedMilliseconds", 0.1),
            Map.of("itemCount", 100, "elapsedMilliseconds", 0.5),
            Map.of("itemCount", 1000, "elapsedMilliseconds", 5.0),
            Map.of("itemCount", 10000, "elapsedMilliseconds", 50.0)),
        "complexity",
        "O(n) time and O(n) space",
        "note",
        "Illustrative figures only; not a measured benchmark.");
  }

  private String signature(String data, String secret) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  private JsonNode razor(String method, String path, Object payload) throws Exception {
    return gateway.request(method, path, payload);
  }

  @PostMapping("/payments/create")
  @org.springframework.transaction.annotation.Transactional
  public Object pay(
      @RequestBody Map<String, String> body,
      @RequestHeader(value = "Authorization", required = false) String h)
      throws Exception {
    long uid = auth.require(h);
    String id = value(body, "order_id");
    var owner =
        db.queryForList(
            "select user_id,payment_method from orders where order_id=? for update", id);
    if (owner.isEmpty() || ((Number) owner.get(0).get("user_id")).longValue() != uid)
      throw err(HttpStatus.NOT_FOUND, "Your order not found");
    if (owner.get(0).get("payment_method").equals("COD"))
      throw err(HttpStatus.CONFLICT, "Cash on delivery is payable at delivery");
    var previous =
        db.queryForList(
            "select razorpay_order_id,amount_paise,status from payments where order_id=?", id);
    if (!previous.isEmpty()) {
      var p = previous.get(0);
      if (p.get("status").equals("PAID")) throw err(HttpStatus.CONFLICT, "Already paid");
      return Map.of(
          "key_id",
          gateway.keyId(),
          "razorpay_order_id",
          p.get("razorpay_order_id"),
          "amount",
          p.get("amount_paise"),
          "currency",
          "INR");
    }
    BigDecimal total = money(stored(id).get("total"));
    long amount = total.multiply(BigDecimal.valueOf(100)).longValueExact();
    if (amount <= 0) throw err(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid total");
    JsonNode r =
        razor("POST", "orders", Map.of("amount", amount, "currency", "INR", "receipt", id));
    String rid = r.path("id").asText();
    db.update(
        "insert into payments(order_id,user_id,razorpay_order_id,amount_paise) values(?,?,?,?)",
        id,
        uid,
        rid,
        amount);
    return Map.of(
        "key_id", gateway.keyId(), "razorpay_order_id", rid, "amount", amount, "currency", "INR");
  }

  private void paid(String rid, String pid) {
    var rows =
        db.queryForList(
            "select id,order_id,user_id,amount_paise,status from payments where"
                + " razorpay_order_id=?",
            rid);
    if (rows.isEmpty()) throw err(HttpStatus.NOT_FOUND, "Payment not found");
    var p = rows.get(0);
    if (p.get("status").equals("PAID")) return;
    int updated =
        db.update(
            "update payments set status='PAID',razorpay_payment_id=? where id=? and status<>'PAID'",
            pid,
            p.get("id"));
    if (updated > 0) {
      var u = user(((Number) p.get("user_id")).longValue());
      mail.send(
          u.get("email").toString(),
          "Rasoi Route payment confirmed",
          "Payment confirmed for order "
              + p.get("order_id")
              + ". Amount: INR "
              + (((Number) p.get("amount_paise")).longValue() / 100.0));
    }
  }

  @PostMapping("/payments/verify")
  @org.springframework.transaction.annotation.Transactional
  public Object verify(
      @RequestBody Map<String, String> body,
      @RequestHeader(value = "Authorization", required = false) String h)
      throws Exception {
    long uid = auth.require(h);
    String rid = value(body, "razorpay_order_id"), pid = value(body, "razorpay_payment_id");
    var rows =
        db.queryForList(
            "select user_id,amount_paise,order_id from payments where razorpay_order_id=?", rid);
    if (rows.isEmpty() || ((Number) rows.get(0).get("user_id")).longValue() != uid)
      throw err(HttpStatus.NOT_FOUND, "Payment not found");
    String expected = signature(rid + "|" + pid, gateway.keySecret());
    if (!java.security.MessageDigest.isEqual(
        expected.getBytes(StandardCharsets.UTF_8),
        value(body, "razorpay_signature").getBytes(StandardCharsets.UTF_8)))
      throw err(HttpStatus.BAD_REQUEST, "Invalid payment signature");
    JsonNode payment =
        razor("GET", "payments/" + URLEncoder.encode(pid, StandardCharsets.UTF_8), null);
    if (!payment.path("order_id").asText().equals(rid)
        || !payment.path("currency").asText().equals("INR")
        || !payment.path("status").asText().equals("captured")
        || payment.path("amount").asLong()
            != ((Number) rows.get(0).get("amount_paise")).longValue())
      throw err(HttpStatus.CONFLICT, "Payment not captured or amount mismatch");
    paid(rid, pid);
    return Map.of(
        "status",
        "PAID",
        "order_id",
        rows.get(0).get("order_id"),
        "bill",
        stored(rows.get(0).get("order_id").toString()));
  }

  @PostMapping("/payments/webhook")
  @org.springframework.transaction.annotation.Transactional
  public Object webhook(
      @RequestBody String raw,
      @RequestHeader(value = "X-Razorpay-Signature", required = false) String sig)
      throws Exception {
    String expected = signature(raw, gateway.webhookSecret());
    if (sig == null
        || !java.security.MessageDigest.isEqual(
            expected.getBytes(StandardCharsets.UTF_8), sig.getBytes(StandardCharsets.UTF_8)))
      throw err(HttpStatus.BAD_REQUEST, "Invalid webhook signature");
    JsonNode event = mapper.readTree(raw);
    if (event.path("event").asText().equals("payment.captured")) {
      JsonNode p = event.path("payload").path("payment").path("entity");
      String rid = p.path("order_id").asText();
      var rows =
          db.queryForList("select amount_paise from payments where razorpay_order_id=?", rid);
      if (!rows.isEmpty()
          && p.path("currency").asText().equals("INR")
          && p.path("status").asText().equals("captured")
          && p.path("amount").asLong() == ((Number) rows.get(0).get("amount_paise")).longValue())
        paid(rid, p.path("id").asText());
    }
    return Map.of("ok", true);
  }
}
