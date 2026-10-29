package com.example.babything_api.modules.care.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import com.example.babything_api.modules.care.entity.CareBatchStatus;
import com.example.babything_api.modules.care.entity.CareGrade;
import com.example.babything_api.modules.care.entity.CareItemStatus;
import com.example.babything_api.modules.care.entity.DropoffMethod;
import com.example.babything_api.modules.products.entity.AgeRange;

public final class CareDtos {

    /** Giống ProductRequest: link ngoài hoặc ảnh đã tải lên qua /api/products/images. */
    static final String IMAGE_URL = "^(https?://\\S+|/api/uploads/(?!.*\\.\\.)[A-Za-z0-9/._-]+)$";

    private CareDtos() {
    }

    // ---------------------------------------------------------------- Người bán

    public record ItemRequest(
            @NotBlank(message = "Vui lòng nhập tên món") @Size(max = 200) String name,
            @NotBlank(message = "Vui lòng chọn loại hàng") @Size(max = 100) String category,
            @Size(max = 30) String size,
            AgeRange ageRange,
            @Size(max = 100) String brand,
            @NotNull(message = "Vui lòng nhập giá mong muốn") @DecimalMin(value = "1000", message = "Giá mong muốn tối thiểu 1.000đ")
            @DecimalMax("100000000") BigDecimal desiredPrice,
            @Size(max = 2000) String description,
            @Size(max = 500) @Pattern(regexp = "^$|" + IMAGE_URL, message = "Ảnh không hợp lệ") String photoUrl) {
    }

    public record CreateRequest(
            @NotNull(message = "Vui lòng chọn cách gửi hàng") DropoffMethod dropoffMethod,
            @Size(max = 1000) String note,
            @NotEmpty(message = "Lô cần ít nhất 1 món") @Size(max = 5, message = "Mỗi lô tối đa 5 món") List<@Valid ItemRequest> items) {
    }

    /** Người bán đồng ý thoả thuận ký gửi: gửi kèm phiên bản điều khoản đã đọc (Rules.agreementVersion). */
    public record AgreeRequest(@NotBlank(message = "Vui lòng đọc và đồng ý điều khoản ký gửi") @Size(max = 20) String agreementVersion) {
    }

    // ---------------------------------------------------------------- Admin

    /**
     * accept = false: không tiếp nhận (reason bắt buộc). accept = true: báo giá sơ bộ cho cả lô — khoảng giá niêm
     * yết, phạm vi điều chỉnh (maxDiscount: giá sàn thấp hơn giá niêm yết tối đa bao nhiêu, 0.3 = 30%) và phí vệ sinh.
     */
    public record ScreenRequest(boolean accept, BigDecimal expectedMin, BigDecimal expectedMax, BigDecimal estimatedFee,
            @DecimalMin("0") @DecimalMax(value = "0.5", message = "Phạm vi điều chỉnh tối đa 50%") BigDecimal maxDiscount,
            @Size(max = 500) String reason) {
    }

    /** Biên bản tiếp nhận: ảnh tình trạng lúc mở hàng (bắt buộc) và ghi chú đối chiếu khai báo. */
    public record ReceiveRequest(@Size(max = 1000) String intakeNote,
            @NotEmpty(message = "Chụp ít nhất 1 ảnh tình trạng lúc nhận hàng") @Size(max = 20) List<@NotBlank @Size(max = 500) @Pattern(regexp = IMAGE_URL, message = "Ảnh không hợp lệ") String> imageUrls) {
    }

    /** Bước 9: làm sạch theo SOP, ghi người thực hiện. */
    public record CleanRequest(@NotBlank(message = "Ghi tên người thực hiện") @Size(max = 100) String cleanedBy,
            @Size(max = 1000) String note) {
    }

    public record RepriceItem(@NotNull Long id,
            @NotNull @DecimalMin(value = "1000", message = "Giá tối thiểu 1.000đ") @DecimalMax("100000000") BigDecimal price) {
    }

    /** Điều chỉnh giá món đang bán: trong phạm vi (≥ giá sàn) áp dụng ngay, thấp hơn giá sàn thì chờ người bán duyệt. */
    public record RepriceRequest(@NotEmpty List<@Valid RepriceItem> items) {
    }

    /** accepted = false: món không đạt (rejectReason bắt buộc), trả lại cùng lô. */
    public record QuoteItem(@NotNull Long id, boolean accepted, CareGrade grade, @Size(max = 1000) String defects,
            BigDecimal listPrice, BigDecimal floorPrice, @Size(max = 500) String rejectReason) {
    }

    public record QuoteRequest(
            @NotNull(message = "Vui lòng nhập phí vệ sinh") @DecimalMin("0") @DecimalMax("10000000") BigDecimal cleaningFee,
            @NotEmpty List<@Valid QuoteItem> items) {
    }

    /** Ảnh chuẩn chụp sau khi làm sạch, QC đạt. */
    public record ListItem(@NotNull Long id,
            @NotEmpty(message = "Mỗi món cần ít nhất 1 ảnh chụp sau làm sạch") @Size(max = 10) List<@NotBlank @Size(max = 500) @Pattern(regexp = IMAGE_URL, message = "Ảnh không hợp lệ") String> imageUrls,
            @Size(max = 2000) String description) {
    }

    public record ListRequest(@NotEmpty List<@Valid ListItem> items) {
    }

    public record ReasonRequest(@Size(max = 500) String reason) {
    }

    // ---------------------------------------------------------------- Response

    public record Seller(Long id, String displayName, String email) {
    }

    /** currentPrice / productStatus / productStock: tin đăng đang bán của món (null khi chưa lên sàn). */
    public record ItemResponse(Long id, int position, String name, String category, String size, AgeRange ageRange,
            String brand, BigDecimal desiredPrice, String description, String photoUrl, CareItemStatus status,
            CareGrade grade, String gradeLabel, String defects, String rejectReason, BigDecimal listPrice,
            BigDecimal floorPrice, BigDecimal proposedPrice, Long productId, BigDecimal currentPrice,
            Integer productStock, Instant soldAt) {
    }

    /**
     * Số tiền của lô theo báo giá chính thức: listTotal = tổng giá niêm yết các món đạt, commission = 10%,
     * costRatio = (hoa hồng + phí vệ sinh) / listTotal, phải ≤ 30%. soldTotal / payoutTotal: phần đã bán được.
     */
    public record Money(BigDecimal listTotal, BigDecimal floorTotal, BigDecimal commission, BigDecimal cleaningFee,
            BigDecimal estimatedPayout, BigDecimal costRatio, BigDecimal soldTotal, BigDecimal payoutTotal) {
    }

    public record BatchResponse(Long id, String code, CareBatchStatus status, String statusLabel, Seller seller,
            DropoffMethod dropoffMethod, String sellerNote, String declineReason, BigDecimal expectedMin,
            BigDecimal expectedMax, BigDecimal estimatedFee, BigDecimal maxDiscount, String agreementVersion,
            String intakeNote, List<String> intakePhotoUrls, BigDecimal cleaningFee, String feePaymentRef,
            String cleanedBy, String cleanNote, Money money, int itemCount, int soldCount, boolean canExtend,
            Instant preQuotedAt, Instant agreedAt, Instant receivedAt, Instant quotedAt, Instant feePaidAt,
            Instant cleanedAt, Instant listedAt, Instant priceDropAt, Instant priceDroppedAt,
            Instant priceProposedAt, Instant expiresAt,
            Instant extendedAt, String returnReason, Instant returnedAt, Instant closedAt, Instant createdAt,
            Instant updatedAt, List<ItemResponse> items) {
    }

    /** Sức chứa kho (tài liệu BMC 7.4.1): tối đa capacity lô đang lưu, monthlyLimit lô mới mỗi tháng. */
    public record Stats(Map<CareBatchStatus, Long> byStatus, long stored, int capacity, long monthIntake,
            int monthlyLimit, BigDecimal feesCollected) {
    }

    /** Quy tắc nghiệp vụ để giao diện hiển thị và kiểm tra trước khi gửi. */
    public record Rules(List<String> categories, int maxItems, BigDecimal minLotValue, BigDecimal maxCostRatio,
            BigDecimal commissionRate, int consignmentDays, int priceDropDay, int extensionDays, int reminderDays,
            String agreementVersion, List<String> agreementTerms) {
    }
}
