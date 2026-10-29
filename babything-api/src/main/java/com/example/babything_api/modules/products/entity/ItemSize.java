package com.example.babything_api.modules.products.entity;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Size món đồ do người bán gõ tự do; chuẩn hoá khi lưu và khi lọc để "80cm", "80 cm", "size 80" cùng là "80",
 * "6 - 12 m" là "6-12M". Migration V12 áp đúng quy tắc này cho dữ liệu cũ.
 */
public final class ItemSize {

    private static final Pattern DASHES = Pattern.compile("[–—]");
    private static final Pattern SPACES = Pattern.compile("\\s+");
    private static final Pattern SIZE_PREFIX = Pattern.compile("^SIZE ?");
    private static final Pattern AROUND_DASH = Pattern.compile(" ?- ?");
    private static final Pattern NUMBER_UNIT = Pattern.compile("(\\d) (CM|M|Y|T)\\b");
    private static final Pattern CM_ONLY = Pattern.compile("^(\\d+([.,]\\d+)?)CM$");

    private ItemSize() {
    }

    /** null hoặc chỉ có khoảng trắng thì trả về null. */
    public static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        String s = raw.trim().toUpperCase(Locale.ROOT);
        s = DASHES.matcher(s).replaceAll("-");
        s = SPACES.matcher(s).replaceAll(" ");
        s = SIZE_PREFIX.matcher(s).replaceFirst("");
        s = AROUND_DASH.matcher(s).replaceAll("-");
        s = NUMBER_UNIT.matcher(s).replaceAll("$1$2");
        s = CM_ONLY.matcher(s).replaceFirst("$1");
        return s.isEmpty() ? null : s;
    }
}
