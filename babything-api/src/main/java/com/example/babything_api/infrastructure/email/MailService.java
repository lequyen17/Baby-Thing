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
        send(to, "Mã xác minh đăng ký Baby Things", """
                Chào %s,

                Mã xác minh đăng ký của bạn là: %s
                Mã có hiệu lực trong %d phút. Không chia sẻ mã này với bất kỳ ai.

                Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.
                """.formatted(displayName, otp, props.otp().ttl().toMinutes()));
    }

    public void sendLoginOtp(String to, String displayName, String otp) {
        send(to, "Mã xác minh đăng nhập Baby Things", """
                Chào %s,

                Mã xác minh đăng nhập của bạn là: %s
                Mã có hiệu lực trong %d phút. Không chia sẻ mã này với bất kỳ ai.

                Nếu không phải bạn đăng nhập, hãy đổi mật khẩu ngay.
                """.formatted(displayName, otp, props.otp().ttl().toMinutes()));
    }

    public void sendPasswordReset(String to, String displayName, String link) {
        send(to, "Đặt lại mật khẩu Baby Things", """
                Chào %s,

                Bấm vào link dưới đây để đặt lại mật khẩu (có hiệu lực trong %d phút):
                %s

                Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
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
