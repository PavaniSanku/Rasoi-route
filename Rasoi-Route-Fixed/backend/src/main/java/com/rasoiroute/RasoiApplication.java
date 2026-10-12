package com.rasoiroute;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class RasoiApplication {
  public static void main(String[] args) {
    SpringApplication.run(RasoiApplication.class, args);
  }
}
