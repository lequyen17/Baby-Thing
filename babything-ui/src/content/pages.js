// Nội dung trang tĩnh và chính sách (SRS mục 3.16 CMS). Khi có backend CMS, file này được thay bằng API.
// `policy: true` => hiển thị phiên bản và ngày hiệu lực (FR-CMS-02).

export const CONTENT = {
  about: {
    path: '/about',
    title: 'Giới thiệu Baby Things',
    intro: 'Baby Things là sàn mua bán đồ mẹ và bé đã qua sử dụng dành cho các gia đình ở Hà Nội.',
    sections: [
      { h: 'Chúng tôi làm gì', p: ['Em bé lớn rất nhanh, nhiều món đồ chỉ dùng vài tháng. Baby Things giúp bố mẹ bán lại những món còn tốt và mua đồ chất lượng với giá dễ chịu hơn.'] },
      { h: 'Vì sao tin cậy', list: ['Mỗi tin đăng dùng biểu mẫu chuẩn: hạng tình trạng A/B/C, khuyết điểm, thời gian dùng và tối thiểu 3 ảnh thật.', 'Tin được kiểm duyệt trước khi hiển thị.', 'Đánh giá chỉ mở sau giao dịch hoàn tất để uy tín dựa trên giao dịch thật.', 'Khiếu nại được xử lý dựa trên bản lưu nguyên trạng tin đăng tại thời điểm đặt hàng.'] },
      { h: 'Một tài khoản, hai vai trò', p: ['Bạn vừa có thể mua vừa có thể bán với cùng một tài khoản. Người mua ở ngoài Hà Nội vẫn đặt hàng được.'] },
    ],
  },

  'guide/buy': {
    path: '/guide/buy',
    title: 'Hướng dẫn mua đồ cũ',
    intro: 'Vài bước đơn giản để chọn được món đồ phù hợp và yên tâm khi nhận hàng.',
    sections: [
      { h: 'Cách đánh giá hạng tình trạng', list: ['A – Như mới: gần như chưa dùng, không có khuyết điểm.', 'B – Rất tốt: dùng nhẹ nhàng, không thấy khuyết điểm rõ.', 'C – Tốt: có khuyết điểm nhỏ, người bán phải ghi rõ và chụp ảnh.'] },
      { h: 'Chọn size cho bé', p: ['Size theo hãng có thể khác nhau. Hãy so với số đo thực tế của bé và hỏi người bán qua tin nhắn nếu chưa chắc. Bộ lọc nhóm tuổi và size giúp thu hẹp kết quả nhanh hơn.'] },
      { h: 'Quy trình đặt hàng', list: ['Chọn sản phẩm, xem kỹ ảnh, khuyết điểm và thời gian đã dùng.', 'Nhắn tin hỏi người bán nếu cần thêm ảnh.', 'Thanh toán online qua cổng thanh toán. Mỗi tin đăng chỉ có số lượng 1 và được giữ chỗ 15 phút khi bạn tạo đơn.', 'Người bán xác nhận trong 24 giờ và giao cho đơn vị vận chuyển.', 'Sau khi nhận hàng, bạn có 48 giờ để đối chiếu với tin đăng rồi xác nhận hoặc mở khiếu nại.'] },
      { h: 'Lưu ý an toàn', p: ['Luôn nhắn tin và thanh toán trên website. Giao dịch ngoài sàn không được hỗ trợ khi có tranh chấp.'] },
    ],
  },

  'guide/sell': {
    path: '/guide/sell',
    title: 'Hướng dẫn đăng bán',
    intro: 'Đăng một tin hoàn chỉnh trong khoảng 5 phút.',
    sections: [
      { h: 'Các bước đăng tin', list: ['Ảnh: tối thiểu 3, tối đa 10 ảnh JPG/PNG/WebP, mỗi ảnh tối đa 5 MB. Nếu có khuyết điểm, cần ít nhất 1 ảnh cận khuyết điểm.', 'Thông tin: tiêu đề 10–100 ký tự, danh mục, nhóm tuổi/size, thương hiệu.', 'Tình trạng: chọn hạng A/B/C, ghi khuyết điểm (hoặc “Không có”) và thời gian đã dùng.', 'Giá: xem trước số tiền bạn thực nhận sau khi trừ hoa hồng.', 'Xem trước và gửi duyệt. Mục tiêu duyệt tin trong 24 giờ.'] },
      { h: 'Điều cần tránh', list: ['Hàng rách, vết bẩn không xử lý được, có mùi, hỏng chức năng hoặc thiếu bộ phận ảnh hưởng an toàn.', 'Từ ngữ cấm: “khử trùng”, “triệt khuẩn”, “an toàn tuyệt đối”, “UV”.', 'Mô tả mơ hồ như “new 90%” mà không kèm chi tiết.'] },
      { h: 'Hoàn thiện hồ sơ người bán', p: ['Bạn cần có tài khoản nhận tiền trước lần chi trả đầu tiên. Địa chỉ lấy hàng và số điện thoại chỉ chia sẻ cho người mua khi cần giao hàng.'] },
    ],
  },

  fees: {
    path: '/fees',
    title: 'Bảng phí',
    intro: 'Người mua không trả phí nền tảng. Người bán chỉ trả hoa hồng khi bán được hàng.',
    table: {
      head: ['Khoản mục', 'Ai trả', 'Mức phí'],
      rows: [
        ['Hoa hồng bán hàng', 'Người bán', '10% giá bán thực tế (không tính trên phí ship)'],
        ['Phí vận chuyển', 'Người mua', 'Tính tại bước thanh toán theo đơn vị vận chuyển'],
        ['Phí cổng thanh toán', 'Baby Things', 'Baby Things chịu'],
        ['Đăng tin', 'Miễn phí', '—'],
      ],
    },
    sections: [{ h: 'Ví dụ', p: ['Bạn bán một món giá 150.000 đ: hoa hồng 15.000 đ, bạn nhận 135.000 đ. Tiền được chi trả theo chu kỳ (mặc định hàng tuần) vào tài khoản nhận tiền của bạn.'] }],
  },

  faq: {
    path: '/faq',
    title: 'Câu hỏi thường gặp',
    intro: 'Những thắc mắc phổ biến khi mua và bán trên Baby Things.',
    faq: [
      ['Tôi có thể vừa mua vừa bán không?', 'Có. Một tài khoản dùng cho cả hai vai trò.'],
      ['Tôi thanh toán bằng cách nào?', 'Thanh toán online qua cổng thanh toán (QR, thẻ ATM nội địa, ví điện tử). Hiện chưa hỗ trợ thanh toán khi nhận hàng.'],
      ['Nếu hàng không đúng mô tả thì sao?', 'Bạn có 48 giờ sau khi nhận hàng để mở khiếu nại kèm ảnh. Baby Things đối chiếu với bản lưu tin đăng tại thời điểm bạn đặt hàng để đưa ra kết luận.'],
      ['Bao lâu thì tin của tôi được duyệt?', 'Mục tiêu xử lý trong 24 giờ. Nếu cần chỉnh sửa, bạn sẽ nhận thông báo kèm lý do.'],
      ['Khi nào tôi nhận được tiền bán hàng?', 'Sau khi đơn hoàn tất (hết hạn kiểm tra hoặc người mua xác nhận) và không có khiếu nại, tiền được chi trả theo chu kỳ hàng tuần.'],
      ['Vì sao tin nhắn của tôi bị cảnh báo?', 'Tin nhắn chứa số điện thoại, số tài khoản hoặc link mạng xã hội sẽ được nhắc rằng giao dịch ngoài sàn không được bảo vệ.'],
      ['Tôi có thể xoá tài khoản và dữ liệu không?', 'Bạn có thể yêu cầu xem, tải hoặc xoá dữ liệu cá nhân. Một số dữ liệu giao dịch phải lưu theo quy định về kế toán và thuế.'],
    ],
  },

  terms: {
    path: '/terms',
    policy: true,
    version: '1.0',
    effective: '2026-01-01',
    title: 'Điều khoản sử dụng',
    intro: 'Khi tạo tài khoản và sử dụng Baby Things, bạn đồng ý với các điều khoản dưới đây.',
    sections: [
      { h: '1. Tài khoản', list: ['Bạn cung cấp thông tin chính xác và chịu trách nhiệm bảo mật mật khẩu.', 'Một tài khoản dùng cho cả mua và bán. Số điện thoại/email cần được xác minh.', 'Baby Things có thể hạn chế hoặc khoá tài khoản vi phạm.'] },
      { h: '2. Nội dung tin đăng', list: ['Mỗi tin đăng là một món hàng duy nhất, thông tin phải trung thực, dùng ảnh thật do bạn chụp.', 'Không được đăng hàng nằm trong Danh mục hàng cấm.', 'Không dùng từ ngữ “khử trùng”, “triệt khuẩn”, “an toàn tuyệt đối”, “UV”.', 'Tin đăng được kiểm duyệt trước khi hiển thị.'] },
      { h: '3. Giao dịch và thanh toán', list: ['Mọi giao dịch diễn ra trên website. Thanh toán thực hiện qua đối tác thanh toán được cấp phép; Baby Things không giữ tiền trong ví nội bộ.', 'Người bán trả hoa hồng 10% trên giá bán thực tế. Người mua không trả phí nền tảng.', 'Giao dịch ngoài nền tảng không được hỗ trợ khi có tranh chấp.'] },
      { h: '4. Khiếu nại và đánh giá', p: ['Việc khiếu nại, trả hàng được thực hiện theo Chính sách khiếu nại/trả hàng. Đánh giá chỉ được gửi sau khi giao dịch hoàn tất; đánh giá vi phạm (xúc phạm, lộ thông tin cá nhân, spam) có thể bị ẩn.'] },
      { h: '5. Trách nhiệm', p: ['Baby Things là nền tảng kết nối người mua và người bán, nỗ lực kiểm duyệt nhưng không thay thế việc người mua kiểm tra hàng trong thời hạn quy định. Chúng tôi tuân thủ quy định về sàn thương mại điện tử và bảo vệ dữ liệu cá nhân hiện hành.'] },
    ],
  },

  privacy: {
    path: '/privacy',
    policy: true,
    version: '1.0',
    effective: '2026-01-01',
    title: 'Chính sách quyền riêng tư',
    intro: 'Baby Things thu thập và sử dụng dữ liệu cá nhân của bạn như thế nào.',
    sections: [
      { h: 'Dữ liệu chúng tôi thu thập', list: ['Thông tin tài khoản: email, tên hiển thị, ảnh đại diện, khu vực.', 'Thông tin giao hàng: tên, số điện thoại, địa chỉ.', 'Thông tin nhận tiền của người bán: ngân hàng, số tài khoản (được mã hoá khi lưu).', 'Dữ liệu sử dụng: lịch sử xem, tìm kiếm, tin nhắn trong nền tảng.'] },
      { h: 'Mục đích sử dụng', list: ['Vận hành giao dịch, giao hàng, chi trả và hỗ trợ khiếu nại.', 'Bảo mật tài khoản và phòng chống gian lận.', 'Gửi thông báo giao dịch. Thông tin tiếp thị và gợi ý chỉ gửi khi bạn đồng ý riêng.'] },
      { h: 'Chia sẻ dữ liệu', p: ['Số điện thoại và địa chỉ chi tiết của một bên chỉ hiển thị cho bên còn lại khi cần giao hàng và không công khai trên hồ sơ. Chúng tôi chia sẻ dữ liệu cần thiết với đối tác thanh toán và vận chuyển để thực hiện đơn hàng.'] },
      { h: 'Quyền của bạn', list: ['Xem và tải dữ liệu cá nhân của mình.', 'Yêu cầu chỉnh sửa hoặc xoá dữ liệu.', 'Rút lại đồng ý nhận thông tin tiếp thị bất kỳ lúc nào trong Cài đặt thông báo.'] },
      { h: 'Lưu trữ', p: ['Dữ liệu giao dịch và chứng từ được lưu theo thời hạn luật định về kế toán, thuế. Phiên bản chính sách và thời điểm bạn đồng ý được ghi lại.'] },
    ],
  },

  returns: {
    path: '/returns',
    policy: true,
    version: '1.0',
    effective: '2026-01-01',
    title: 'Chính sách khiếu nại và trả hàng',
    intro: 'Quy trình xử lý khi hàng nhận được không đúng với tin đăng.',
    sections: [
      { h: 'Thời hạn kiểm tra', p: ['Sau khi đơn được giao thành công, bạn có 48 giờ để đối chiếu hàng với tin đăng. Hết hạn mà không khiếu nại, đơn tự hoàn tất và tiền được chuyển cho người bán.'] },
      { h: 'Lý do được khiếu nại', list: ['Không đúng mô tả.', 'Khuyết điểm không được khai báo.', 'Vấn đề vệ sinh.', 'Sai size, thiếu hàng.', 'Hư hỏng khi vận chuyển.'] },
      { h: 'Quy trình', list: ['Bạn mở khiếu nại, chọn lý do, mô tả và đính kèm tối thiểu 1 ảnh (video tuỳ chọn).', 'Tiền của đơn được tạm giữ, chưa chi trả cho người bán.', 'Người bán phản hồi trong 48 giờ: đồng ý hoàn, đề xuất hoàn một phần hoặc phản bác kèm bằng chứng.', 'Nếu quá hạn hoặc chưa thống nhất, nhân viên Baby Things đối chiếu bản lưu tin đăng, ảnh, tin nhắn và hành trình vận chuyển để kết luận.'] },
      { h: 'Kết luận có thể có', list: ['Hoàn toàn bộ kèm trả hàng.', 'Hoàn một phần.', 'Từ chối khiếu nại.'] },
      { h: 'Phí vận chuyển trả hàng', p: ['Bên chịu phí được xác định theo kết luận khiếu nại, ghi rõ lý do.'] },
    ],
  },

  shipping: {
    path: '/shipping',
    policy: true,
    version: '1.0',
    effective: '2026-01-01',
    title: 'Chính sách vận chuyển',
    intro: 'Cách hàng được giao từ người bán đến người nhận.',
    sections: [
      { h: 'Phí vận chuyển', p: ['Phí được tính tự động tại bước thanh toán dựa trên địa chỉ lấy, địa chỉ giao, khối lượng và kích thước ước tính theo danh mục.'] },
      { h: 'Quy trình giao hàng', list: ['Người bán xác nhận đơn trong 24 giờ; hệ thống tạo vận đơn với thông tin điền sẵn.', 'Người bán đóng gói, in phiếu gửi và bàn giao cho đơn vị vận chuyển.', 'Bạn theo dõi hành trình ngay trong chi tiết đơn hàng.'] },
      { h: 'Giao thất bại và hoàn hàng', p: ['Nếu giao thất bại hoặc hàng bị hoàn, hệ thống cập nhật trạng thái đơn và hoàn tiền theo quy định. Khi hệ thống vận chuyển gặp sự cố, nhân viên Baby Things có thể cập nhật trạng thái thủ công.'] },
      { h: 'Khu vực', p: ['Người mua ở ngoài Hà Nội vẫn đặt hàng được; người bán tập trung ở Hà Nội trong giai đoạn đầu.'] },
    ],
  },

  prohibited: {
    path: '/prohibited',
    policy: true,
    version: '1.0',
    effective: '2026-01-01',
    title: 'Danh mục hàng cấm đăng',
    intro: 'Vì an toàn của trẻ nhỏ, những mặt hàng sau không được đăng bán trên Baby Things.',
    sections: [
      { h: 'Hàng cấm', list: ['Núm vú, bình sữa đã sử dụng.', 'Sữa và thực phẩm.', 'Thuốc và mỹ phẩm đã mở.', 'Ghế ô tô đã va chạm hoặc không rõ lịch sử.', 'Hàng bị thu hồi.'] },
      { h: 'Danh mục tạm khoá', p: ['Một số danh mục cần kiểm tra an toàn phức tạp như ghế ô tô, cũi và thiết bị y tế tạm khoá khi ra mắt và sẽ mở lại khi sẵn sàng.'] },
      { h: 'Hàng không đạt điều kiện', p: ['Hàng rách, vết bẩn không xử lý được, có mùi, hỏng chức năng hoặc thiếu bộ phận ảnh hưởng an toàn không được đăng bán.'] },
      { h: 'Báo cáo vi phạm', p: ['Nếu thấy tin đăng vi phạm, hãy dùng nút “Báo cáo” trên trang sản phẩm hoặc trong hội thoại để chúng tôi kiểm tra.'] },
    ],
  },
};

export const CONTENT_LIST = Object.entries(CONTENT).map(([key, page]) => ({ key, ...page }));
export const POLICY_LIST = CONTENT_LIST.filter((p) => p.policy);
