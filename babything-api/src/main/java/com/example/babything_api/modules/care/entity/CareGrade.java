package com.example.babything_api.modules.care.entity;

import com.example.babything_api.modules.products.entity.ProductCondition;

/** Cấp tình trạng Care (tài liệu BMC 7.5.1), quy đổi sang tình trạng của tin đăng. */
public enum CareGrade {
    A("Như mới", ProductCondition.LIKE_NEW),
    B("Rất tốt", ProductCondition.GOOD),
    C("Tốt", ProductCondition.FAIR);

    private final String label;
    private final ProductCondition condition;

    CareGrade(String label, ProductCondition condition) {
        this.label = label;
        this.condition = condition;
    }

    public String label() {
        return label;
    }

    public ProductCondition condition() {
        return condition;
    }
}
