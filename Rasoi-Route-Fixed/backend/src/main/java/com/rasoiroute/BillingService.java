package com.rasoiroute;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** All prices come from the trusted catalog. Clients send choices, never prices. */
@Service
public class BillingService {
  private final MenuService menu;

  public BillingService(MenuService menu) {
    this.menu = menu;
  }

  private BigDecimal amount(String n) {
    return new BigDecimal(n).setScale(2, RoundingMode.HALF_UP);
  }

  private BigDecimal round(BigDecimal n) {
    return n.setScale(2, RoundingMode.HALF_UP);
  }

  private ResponseStatusException invalid(String message) {
    return new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, message);
  }

  private String choice(JsonNode input, String field, String fallback, String... allowed) {
    String value = input.path(field).asText(fallback);
    if (!Arrays.asList(allowed).contains(value)) throw invalid("Invalid " + field);
    return value;
  }

  private String text(JsonNode input, String field, int max) {
    String value = input.path(field).asText("").trim();
    if (value.length() > max) throw invalid(field + " is too long");
    return value;
  }

  public Map<String, Object> calculate(JsonNode input, String orderId, String createdAt) {
    JsonNode entries = input.path("items");
    if (!entries.isArray() || entries.isEmpty() || entries.size() > 100)
      throw invalid("Select 1 to 100 menu items");
    Map<String, Integer> quantities = new LinkedHashMap<>();
    for (JsonNode item : entries) {
      JsonNode q = item.path("quantity");
      if (!q.isIntegralNumber() || !q.canConvertToInt())
        throw invalid("Quantity must be a whole number");
      int quantity = q.intValue();
      String id = item.path("itemId").asText();
      if (quantity < 1 || quantity > 99 || quantities.merge(id, quantity, Integer::sum) > 99)
        throw invalid("Quantity must be 1 to 99");
    }
    List<Map<String, Object>> items = new ArrayList<>();
    BigDecimal subtotal = amount("0");
    for (var entry : quantities.entrySet()) {
      var dish = menu.get(entry.getKey());
      if (dish == null) throw invalid("Unknown menu item");
      BigDecimal price = amount(dish.get("price").toString());
      BigDecimal total = price.multiply(BigDecimal.valueOf(entry.getValue()));
      subtotal = subtotal.add(total);
      items.add(
          Map.of(
              "id",
              entry.getKey(),
              "itemId",
              entry.getKey(),
              "name",
              dish.get("name"),
              "quantity",
              entry.getValue(),
              "unitPrice",
              price,
              "total",
              total));
    }
    String coupon = text(input, "coupon", 30).toUpperCase(Locale.ROOT);
    BigDecimal discount = amount("0");
    String discountLabel = "No discount";
    if (!coupon.isEmpty()) {
      BigDecimal minimum;
      switch (coupon) {
        case "WELCOME50" -> {
          minimum = amount("0");
          discount = amount("50");
          discountLabel = "WELCOME50 (Welcome First Order)";
        }
        case "SAVE10" -> {
          minimum = amount("300");
          discount = round(subtotal.multiply(new BigDecimal("0.10")));
          discountLabel = "SAVE10 (Save Big 10%)";
        }
        case "FESTIVE20" -> {
          minimum = amount("800");
          discount = round(subtotal.multiply(new BigDecimal("0.20")));
          discountLabel = "FESTIVE20 (Festive Feast 20%)";
        }
        case "FIRSTBITE" -> {
          minimum = amount("400");
          discount = amount("75");
          discountLabel = "FIRSTBITE (First Bite Delights)";
        }
        case "STUDENT15" -> {
          minimum = amount("350");
          discount = round(subtotal.multiply(new BigDecimal("0.15")));
          discountLabel = "STUDENT15 (Campus Special 15%)";
        }
        default -> throw invalid("Invalid coupon code");
      }
      if (subtotal.compareTo(minimum) < 0) {
        discount = amount("0");
        discountLabel = "No discount";
      }
    }
    if (discount.signum() == 0) {
      String rate =
          subtotal.compareTo(amount("1500")) >= 0
              ? "0.20"
              : subtotal.compareTo(amount("1000")) >= 0
                  ? "0.15"
                  : subtotal.compareTo(amount("500")) >= 0 ? "0.10" : "0";
      discount = round(subtotal.multiply(new BigDecimal(rate)));
      if (discount.signum() > 0)
        discountLabel =
            new BigDecimal(rate).multiply(new BigDecimal("100")).intValue() + "% Order Discount";
    }
    discount = discount.min(subtotal);
    String tier = choice(input, "deliveryTier", "standard", "standard", "priority", "eco");
    BigDecimal delivery =
        subtotal.compareTo(amount("1000")) >= 0
            ? amount("0")
            : subtotal.compareTo(amount("600")) >= 0
                ? amount("20")
                : subtotal.compareTo(amount("300")) >= 0 ? amount("30") : amount("40");
    if (tier.equals("priority")) delivery = delivery.add(amount("25"));
    if (tier.equals("eco")) delivery = delivery.subtract(amount("10")).max(amount("0"));
    BigDecimal packaging = input.path("ecoPackaging").asBoolean(true) ? amount("15") : amount("0");
    BigDecimal platform = amount("5");
    JsonNode tipNode = input.path("riderTip");
    if (!tipNode.isMissingNode() && !tipNode.isNumber()) throw invalid("Invalid tip");
    BigDecimal tip = tipNode.isMissingNode() ? amount("30") : tipNode.decimalValue();
    if (tip.signum() < 0
        || tip.compareTo(amount("1000")) > 0
        || tip.stripTrailingZeros().scale() > 2)
      throw invalid("Tip must be between ₹0 and ₹1000 with at most two decimals");
    tip = round(tip);
    if (input.path("redeemCoins").asBoolean(false)
        || input.path("charityRoundUpEnabled").asBoolean(false)
        || !input.path("selectedBankOffer").asText("none").equals("none"))
      throw invalid("Loyalty, charity and bank offers are not enabled");
    String method = choice(input, "paymentMethod", "COD", "COD", "UPI", "CARD", "NETBANKING");
    BigDecimal taxable = subtotal.subtract(discount).add(delivery).add(packaging).add(platform);
    BigDecimal cgst = round(taxable.multiply(new BigDecimal("0.025")));
    BigDecimal gst = cgst.multiply(BigDecimal.valueOf(2));
    BigDecimal total = taxable.add(gst).add(tip);
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("orderId", orderId);
    result.put("createdAt", createdAt);
    result.put("invoiceNumber", "INV-" + orderId.substring(4));
    result.put("items", items);
    result.put("subtotal", subtotal);
    result.put("discount", discount);
    result.put("discountLabel", discountLabel);
    result.put("coupon", coupon);
    result.put("deliveryTier", tier);
    result.put("deliveryFee", delivery);
    result.put("delivery", delivery);
    result.put("deliveryLabel", tier + " delivery");
    result.put("packagingFee", packaging);
    result.put("platformFee", platform);
    result.put("ecoPackaging", input.path("ecoPackaging").asBoolean(true));
    result.put("noCutlery", input.path("noCutlery").asBoolean(true));
    result.put("riderTip", tip);
    result.put("coinsDiscount", amount("0"));
    result.put("paymentOfferDiscount", amount("0"));
    result.put("paymentOfferLabel", "");
    result.put("charityRoundUp", amount("0"));
    result.put("taxableAmount", taxable);
    result.put("cgst", cgst);
    result.put("sgst", cgst);
    result.put("gst", gst);
    result.put("grandTotal", total);
    result.put("total", total);
    result.put("paymentMethod", method);
    result.put("paymentStatus", method.equals("COD") ? "DUE" : "PENDING");
    for (String field :
        List.of("customerName", "customerPhone", "customerAddress", "companyName", "gstin"))
      result.put(field, text(input, field, field.equals("customerAddress") ? 500 : 100));
    boolean corporate = input.path("isCorporateGst").asBoolean(false);
    result.put("isCorporateGst", corporate);
    if (corporate
        && (result.get("companyName").toString().isBlank()
            || !result
                .get("gstin")
                .toString()
                .matches("[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]")))
      throw invalid("Valid company name and GSTIN required");
    return result;
  }

  public void validateCustomer(Map<String, Object> bill) {
    if (bill.get("customerName").toString().length() < 2
        || bill.get("customerAddress").toString().length() < 10
        || !bill.get("customerPhone")
            .toString()
            .replaceAll("[ +()-]", "")
            .matches("(?:91)?[6-9][0-9]{9}"))
      throw invalid("Enter customer name, a valid Indian mobile number and full delivery address");
  }
}
