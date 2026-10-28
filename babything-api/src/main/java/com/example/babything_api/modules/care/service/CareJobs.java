package com.example.babything_api.modules.care.service;

import java.util.List;
import java.util.function.Predicate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Mốc thời gian của lô đang bán: ngày 45 giảm về giá sàn, nhắc trước 7 ngày, ngày 60 hết hạn → hoàn trả. */
@Component
public class CareJobs {

    private static final Logger log = LoggerFactory.getLogger(CareJobs.class);

    private final CareService careService;

    public CareJobs(CareService careService) {
        this.careService = careService;
    }

    @Scheduled(fixedDelayString = "PT1M", initialDelayString = "PT45S")
    void run() {
        int dropped = each(careService.findForPriceDrop(), careService::dropPrices, "giảm giá");
        int reminded = each(careService.findForReminder(), careService::remindExpiry, "nhắc hết hạn");
        int expired = each(careService.findExpired(), careService::expire, "kết thúc ký gửi");
        if (dropped + reminded + expired > 0) {
            log.info("Job Care: {} lô giảm giá, {} lô được nhắc, {} lô hết hạn", dropped, reminded, expired);
        }
    }

    /** Mỗi lô một transaction riêng (gọi qua proxy) để một lô lỗi không làm hỏng cả lượt. */
    private static int each(List<Long> ids, Predicate<Long> action, String what) {
        int done = 0;
        for (Long id : ids) {
            try {
                if (action.test(id)) {
                    done++;
                }
            } catch (RuntimeException e) {
                log.warn("Job Care: không {} được lô #{}", what, id, e);
            }
        }
        return done;
    }
}
