package com.example.babything_api.infrastructure.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import com.example.babything_api.config.AppProperties;

@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender mailSender;
    private final AppProperties props;

    public MailService(JavaMailSender mailSender, AppProperties props) {
        this.mailSender = mailSender;
        this.props = props;
    }

    public void sendRegistrationOtp(String to, String displayName, String otp) {
        send(to, "Your registration verification code", """
                Hi %s,

                Your registration verification code is: %s
                The code expires in %d minutes. Do not share it with anyone.

                If you did not sign up, please ignore this email.
                """.formatted(displayName, otp, props.otp().ttl().toMinutes()));
    }

    public void sendLoginOtp(String to, String displayName, String otp) {
        send(to, "Your sign-in verification code", """
                Hi %s,

                Your sign-in verification code is: %s
                The code expires in %d minutes. Do not share it with anyone.

                If this wasn't you, change your password immediately.
                """.formatted(displayName, otp, props.otp().ttl().toMinutes()));
    }

    public void sendPasswordReset(String to, String displayName, String link) {
        send(to, "Reset your password", """
                Hi %s,

                Click the link below to reset your password (valid for %d minutes):
                %s

                If you did not request a password reset, please ignore this email.
                """.formatted(displayName, props.passwordReset().ttl().toMinutes(), link));
    }

    private void send(String to, String subject, String text) {
        if (!props.mail().enabled()) {
            log.info("[MAIL_ENABLED=false] To: {} | Subject: {}\n{}", to, subject, text);
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(props.mail().from());
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        mailSender.send(message);
    }
}
