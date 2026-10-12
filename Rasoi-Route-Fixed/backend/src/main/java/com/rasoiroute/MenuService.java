package com.rasoiroute;

import com.fasterxml.jackson.databind.*;
import java.io.InputStream;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class MenuService {
  private final List<Map<String, Object>> menu;
  private final Map<String, Map<String, Object>> byId = new HashMap<>();

  MenuService(ObjectMapper mapper) throws Exception {
    try (InputStream in = getClass().getResourceAsStream("/menu.json")) {
      menu =
          mapper.readValue(
              in,
              new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, Object>>>() {});
    }
    for (var item : menu) byId.put(item.get("id").toString(), item);
  }

  List<Map<String, Object>> all() {
    return menu;
  }

  Map<String, Object> get(String id) {
    return byId.get(id);
  }
}
