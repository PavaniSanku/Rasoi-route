package com.rasoiroute;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class MailService {
  private final JavaMailSender mail;

  MailService(JavaMailSender mail) {
    this.mail = mail;
  }

  @Async
  public void send(String to, String subject, String body) {
    String from = System.getenv("SMTP_FROM");
    if (from == null || from.isBlank() || System.getenv("SMTP_PASSWORD") == null) return;
    try {
      SimpleMailMessage msg = new SimpleMailMessage();
      msg.setFrom(from);
      msg.setTo(to);
      msg.setSubject(subject);
      msg.setText(body);
      mail.send(msg);
    } catch (Exception e) {
      System.err.println("Email delivery failed: " + e.getMessage());
    }
  }
}
