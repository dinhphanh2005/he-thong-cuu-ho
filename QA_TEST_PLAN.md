# Kế hoạch & Hướng dẫn Thực thi Kiểm thử (QA Test Plan)

Dưới đây là hướng dẫn chi tiết cách để bạn thực thi và kiểm thử các Test Case một cách chính xác nhất trên hệ thống. 

> [!TIP]
> Một số Test Case yêu cầu thao tác thủ công trên ứng dụng để kiểm tra trải nghiệm thực tế (UI/UX), trong khi một số khác (như bảo mật, rate limit) có thể dùng công cụ (như Postman hoặc Script) để kiểm thử một cách thuận tiện.

---

## I. NHÓM XÁC THỰC VÀ PHÂN QUYỀN (AUTH)

### TC-01: Đăng nhập với vai trò Điều phối viên
- **Mục đích**: Đảm bảo luồng đăng nhập trả về đúng Token và role.
- **Cách test**:
  1. Sử dụng ứng dụng Postman hoặc Terminal.
  2. Gửi một request `POST /api/v1/auth/login`.
  3. Trong Body (JSON), truyền vào `email` và `password` hợp lệ của tài khoản có vai trò Điều phối viên.
- **Kết quả mong đợi**: API trả về `HTTP 200 OK`. Trong JSON response sẽ có chứa chuỗi `AccessToken`, `RefreshToken` và trường `role: "DISPATCHER"`.

### TC-02: Kiểm tra phân quyền truy cập API trái phép
- **Mục đích**: Đảm bảo hệ thống chặn người dùng gọi các endpoint không thuộc thẩm quyền (Authorization).
- **Cách test**:
  1. Đăng nhập hệ thống bằng tài khoản của Người dân (CITIZEN) để lấy ra `AccessToken`.
  2. Dùng HTTP Client (Postman) thiết lập header `Authorization: Bearer <Token>`.
  3. Gửi request đến một API dành riêng cho Admin (Ví dụ: `POST /api/v1/rescue-teams` - Thêm Đội cứu hộ mới).
- **Kết quả mong đợi**: Trả về lỗi `HTTP 403 Forbidden` cùng dòng thông báo: *"Không đủ quyền truy cập"*.

---

## II. NHÓM BÁO CÁO VÀ QUẢN LÝ SỰ CỐ (INCIDENTS)

### TC-03: Người dân tạo báo cáo sự cố (Đầy đủ)
- **Mục đích**: Đảm bảo luồng tạo sự cố diễn ra mượt mà và lưu đúng trạng thái.
- **Cách test**:
  1. Mở App Người dân (Mobile App).
  2. Tại màn hình chính (Home), chọn loại sự cố (Ví dụ: `ACCIDENT` / Tai nạn).
  3. Nhập mô tả, chọn vị trí hiện tại (GPS sẽ lấy tọa độ `lat`, `lng`).
  4. Bấm máy ảnh, chụp một bức ảnh thực tế hệ thống và đính kèm (hoặc chọn file ảnh jpg từ thư viện).
  5. Nhấn **Submit (Gửi báo cáo)**.
- **Kết quả mong đợi**: App hiển thị thông báo thành công. Trong database MongoDB sẽ xuất hiện một document mới tại collection `incidents` với trạng thái là `PENDING` và có mã `Tracking Code`.
- *API Tương ứng*: `POST /api/v1/incidents` sẽ trả về `HTTP 201 Created`.

### TC-04: Đội cứu hộ cập nhật trạng thái xử lý
- **Mục đích**: Đảm bảo trạng thái sự cố thay đổi đúng và được lưu vết lại.
- **Cách test**:
  1. Mở App Đội cứu hộ (Mobile App) > Đăng nhập với tài khoản hợp lệ.
  2. Mở tab **Nhiệm vụ** (hoặc sự cố được giao). 
  3. Bấm vào sự cố đang có trạng thái chờ (PENDING/ASSIGNED), chọn nút lệnh chuyển trạng thái sang **Đang xử lý** (IN_PROGRESS).
- **Kết quả mong đợi**: Thông báo cập nhật thành công trên màn hình. Mở Compass truy cập vào collection `incidents`, `status` được đổi thành `IN_PROGRESS` và mảng vòng đời `timeline` có thêm 1 sự kiện log mới.

---

## III. NHÓM THUẬT TOÁN VÀ ĐIỀU PHỐI (DISPATCH)

### TC-05: Thuật toán phân công tự động (Auto-assign)
- **Mục đích**: Thuật toán tìm kiếm xe gần nhất có đang hoạt động tốt hay không.
- **Cách test**:
  1. Bật 2 chiếc điện thoại App Đội cứu hộ (hoặc dùng giả lập) đóng vai 2 xe cứu hộ, bật trạng thái **Rảnh (AVAILABLE)**. Đặt tọa độ GPS cách nhau (ví dụ Xe 1 cách 2km, Xe 2 cách 5km so với điểm xảy ra sự cố). Cả 2 xe này đều phải thuộc chuyên môn "Xe cẩu".
  2. Dùng App Người dân tạo 1 sự kiện hỏng xe, yêu cầu "Xe cẩu" và chọn chế độ tự động điều phối.
- **Kết quả mong đợi**: Hệ thống chạy thuật toán quét và **tự động phân vụ việc** cho Xe 1 (vì cách 2km gần hơn). Màn hình Xe 1 hiện thông báo nhiệm vụ mới.

### TC-06: Tích hợp thuật toán chỉ đường (Routing)
- **Mục đích**: Đảm bảo việc tính toán quãng đường đúng chuẩn.
- **Cách test**:
  1. Trên App Đội cứu hộ, tìm một sự kiện đã nhận, bấm nút **Xem đường đi** (Navigate).
- **Kết quả mong đợi**: Bản đồ trên màn hình sẽ vẽ một nét liền (route) từ tọa độ Xe cứu hộ hiện tại tới Tọa độ điểm sự cố. Thời gian ước tính (ETA) và Khoảng cách (km) hiện rõ.

### TC-07: Quản trị viên thêm Đội cứu hộ mới
- **Mục đích**: Flow khởi tạo trơn tru, phân quyền tốt.
- **Cách test**:
  1. Truy cập Web Admin. Đăng nhập quyền QTV.
  2. Vào phần Quản lý Đội Cứu hộ > Thêm Mới.
  3. Điền bảng thông tin: Tên đội, Biển số, Loại năng lực, Vùng hoạt động (Zone).
  4. Nhấn Lưu dữ liệu.
- **Kết quả mong đợi**: Một dòng hiển thị mới trên web, DB sinh ra tài khoản người dùng với chức vụ đội cứu hộ và lưu hồ sơ xe với thông tin mật khẩu khởi tạo ngẫu nhiên hoặc mặc định.

---

## IV. NHÓM THỜI GIAN THỰC (REAL-TIME SOCKET.IO)

> [!NOTE]
> Nhóm này yêu cầu mở song song 2 thiết bị/màn hình để nhìn thấy độ trễ "trực tiếp" (thường nhỏ hơn 100ms).

### TC-08: Phát tín hiệu SOS khẩn cấp (1 chạm)
- **Cách test**:
  1. Mở màn hình dành cho Điều phối viên (Web Dispatcher) ở trên máy tính.
  2. Tại App Người dùng, nhấn giữ nút **SOS 1 chạm**. App bắt đầu đếm ngược, sau đó chốt gửi tín hiệu.
- **Kết quả mong đợi**: Ở Web Dispatcher ngay lập tức (không cần tải lại trang) phát ra âm thanh báo động, popup đỏ hiện lên bản đồ ưu tiên cao nhất báo hiệu sự cố SOS.

### TC-09: Tracking di chuyển của xe cứu hộ
- **Cách test**:
  1. Mở màn hình bản đồ Web Dispatcher.
  2. Mở App Cứu hộ. Thay đổi vị trí (nếu xài máy ảo, hãy dùng tính năng Simulate Location để cấu hình xe di chuyển 10km/h).
- **Kết quả mong đợi**: Trên màn hình Web Dispatcher, Icon xe cứu hộ lướt/trượt đi rất mượt mà theo từng điểm 10 giây (animation) trên bản đồ lớn, bạn không cần F5 tải lại trang.

### TC-10: Trao đổi chat nội bộ thời gian thực
- **Cách test**:
  1. Mở App Cứu hộ vào khung chat của vụ việc.
  2. Mở Web Dispatcher vào khung chat vụ việc tương tự. Dispatcher gõ text: *"Đi lối cổng phụ"*.
- **Kết quả mong đợi**: App xe cứu hộ tự động nhảy tin nhắn ở dưới cùng khung chat và kêu "Ting" ngay tức thì qua kênh Socket.IO event `chat:message`.

### TC-11: Cơ chế tự kết nối lại (Auto-reconnect)
- **Cách test**: 
  1. Từ App Điện thoại (Cứu hộ), tắt Wifi/4G trong 10 giây, sau đó bật mạng lại bình thường.
- **Kết quả mong đợi**: App hiện icon xoay Spinner hoặc thông báo "Mất kết nối", nhưng ngay sau khi có mạng, App tự gỡ icon spinner và tải lại payload dữ liệu (khôi phục trạng thái cập nhật mới nhất) mà tránh bị crash App.

---

## V. NHÓM BẢO MẬT VÀ TÍCH HỢP NGOÀI (SECURITY & EXTERNAL)

### TC-12: Ngăn chặn tấn công Spam (Rate Limiting)
- **Cách test**: Để test nhanh nhất, tôi cung cấp sẵn một file Script Node.js ở folder hệ thống tên `test_tc12_ratelimit.js`. 
- Trong Terminal backend, chạy lệnh: `node test_tc12_ratelimit.js`. 
- **Kết quả mong đợi**: 50 request đầu tiên báo trạng thái 2xx thành công, từ request 51 trở đi bị Block bằng mã `429 Too Many Requests`.

### TC-13: Bảo vệ mật khẩu trong Cơ sở dữ liệu
- **Cách test**:
  1. Tại màn hình Đăng ký mới (App hoặc Web), tiến hành tạo tài khoản người dùng mới với mật khẩu rõ là: `"12345678"`.
  2. Bật MongoDB Compass, kết nối vào DB, tìm collection `users`. 
- **Kết quả mong đợi**: Tìm đúng tên đăng nhập vừa tạo, trường `password` sẽ là chuỗi bị băm (ví dụ: `$2b$10$Uo...H9v8/` dài 60 kí tự) chứ không được thấy số `"12345678"`.

### TC-14: Gửi thông báo đẩy (Push Notification)
- **Cách test**:
  1. Cài đặt App người dân lên điện thoại thật. (Đã cấp quyền Allow Notification).
  2. Mở Web Dispatcher hoặc Web Admin. Cập nhật vụ việc của tài khoản trên về trạng thái "Hoàn thành" (COMPLETED).
- **Kết quả mong đợi**: Trên màn hình điện thoại thật nổ một Push Notification từ Firebase (FCM/Expo) báo `"Sự cố của bạn đã xử lý xong"`.
