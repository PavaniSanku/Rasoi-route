package com.rasoiroute;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.Test;

class BillingRulesTest {
  final ObjectMapper mapper = new ObjectMapper();

  BillingService service() throws Exception {
    return new BillingService(new MenuService(mapper));
  }

  ObjectNode request(int count, String coupon) {
    ObjectNode input = mapper.createObjectNode();
    input.putArray("items").addObject().put("itemId", "chicken-biryani").put("quantity", count);
    input.put("coupon", coupon);
    input.put("deliveryTier", "eco");
    input.put("ecoPackaging", false);
    input.put("riderTip", 0);
    return input;
  }

  @Test
  void everyAdvertisedCouponUsesItsMinimumAndExactDiscount() throws Exception {
    var expected =
        Map.of(
            "WELCOME50",
            "50.00",
            "SAVE10",
            "99.60",
            "FESTIVE20",
            "199.20",
            "FIRSTBITE",
            "75.00",
            "STUDENT15",
            "149.40");
    for (var e : expected.entrySet()) {
      var bill = service().calculate(request(4, e.getKey()), "ORD-TEST", "2026-10-12");
      assertEquals(new BigDecimal(e.getValue()), bill.get("discount"));
      assertEquals(new BigDecimal("10.00"), bill.get("deliveryFee"));
    }
    assertEquals(
        new BigDecimal("0.00"),
        service().calculate(request(1, "FESTIVE20"), "ORD-TEST", "2026-10-12").get("discount"));
  }

  @Test
  void unsupportedOffersAndInvalidTipsAreRejected() throws Exception {
    var s = service();
    var input = request(2, "");
    input.put("riderTip", 1001);
    assertThrows(
        org.springframework.web.server.ResponseStatusException.class,
        () -> s.calculate(input, "ORD-TEST", "2026-10-12"));
    input.put("riderTip", 0);
    input.put("redeemCoins", true);
    assertThrows(
        org.springframework.web.server.ResponseStatusException.class,
        () -> s.calculate(input, "ORD-TEST", "2026-10-12"));
  }

  @Test
  void welcomeDiscountCannotMakeFoodNegative() throws Exception {
    var input = mapper.createObjectNode();
    input.putArray("items").addObject().put("itemId", "butter-naan").put("quantity", 1);
    input.put("coupon", "WELCOME50");
    var bill = service().calculate(input, "ORD-TEST", "2026-10-12");
    assertTrue(
        ((BigDecimal) bill.get("discount")).compareTo((BigDecimal) bill.get("subtotal")) <= 0);
  }
}
