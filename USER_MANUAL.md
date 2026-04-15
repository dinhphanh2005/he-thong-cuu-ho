# Tài liệu Hướng dẫn Sử dụng
# Hệ thống Tiếp nhận & Cứu hộ Sự cố Giao thông

**Phiên bản**: 1.0  
**Ngày cập nhật**: Tháng 4 năm 2026

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan)
2. [Hướng dẫn Người dân (Citizen)](#2-người-dân)
3. [Hướng dẫn Đội cứu hộ (Rescue Team)](#3-đội-cứu-hộ)
4. [Hướng dẫn Điều phối viên (Dispatcher)](#4-điều-phối-viên)
5. [Hướng dẫn Quản trị viên (Admin)](#5-quản-trị-viên)
6. [Xử lý sự cố thường gặp](#6-xử-lý-sự-cố)

---

## 1. Tổng quan

Hệ thống gồm 2 nền tảng:

- **Mobile App** (dành cho Người dân & Đội cứu hộ): cài đặt qua Expo Go hoặc file APK/IPA.
- **Web Portal** (dành cho Điều phối viên & Quản trị viên): truy cập qua trình duyệt tại `https://yourdomain.com`.

### Phân quyền hệ thống

| Vai trò | Nền tảng | Chức năng chính |
|---------|----------|-----------------|
| CITIZEN | Mobile App | Báo cáo sự cố, SOS, theo dõi trạng thái |
| RESCUE | Mobile App | Nhận nhiệm vụ, cập nhật trạng thái, GPS tracking |
| DISPATCHER | Web Portal | Bản đồ thời gian thực, điều phối sự cố |
| ADMIN | Web Portal | Quản lý toàn hệ thống, báo cáo, cấu hình |

---

## 2. Người dân

### 2.1 Đăng ký tài khoản

1. Mở App → chọn **Đăng ký**.
2. Nhập: Họ tên, Số điện thoại, Email, Mật khẩu (≥ 8 ký tự).
3. Nhấn **Đăng ký** → nhận OTP qua email/SMS → xác nhận.
4. Đăng nhập lại bằng email và mật khẩu vừa tạo.

### 2.2 Báo cáo sự cố thông thường

1. Tại màn hình chính → nhấn **Báo cáo sự cố**.
2. Chọn **Loại sự cố**: Tai nạn / Hỏng xe / Ngập nước / Cháy nổ / Khác.
3. Chọn **Mức độ nghiêm trọng**: Thấp / Trung bình / Cao / Khẩn cấp.
4. Nhập **Mô tả** ngắn gọn tình huống.
5. **Vị trí**: App tự động lấy GPS — hoặc chọn thủ công trên bản đồ.
6. (Tuỳ chọn) Chụp/chọn **ảnh hiện trường** để đính kèm.
7. Nhấn **Gửi báo cáo**.

> Sau khi gửi thành công, App hiển thị **Mã theo dõi** (VD: `INC-2026-0042`). Lưu mã này để tra cứu sau.

### 2.3 Nút SOS khẩn cấp

> Dùng khi cần cứu hộ ngay lập tức — ưu tiên cao nhất.

1. Nhấn giữ nút **SOS đỏ** trên màn hình chính (3 giây).
2. Xác nhận gửi → hệ thống gửi ngay tọa độ GPS hiện tại.
3. Cảnh báo khẩn cấp được phát đến tất cả điều phối viên.
4. Đội cứu hộ gần nhất sẽ được tự động phân công.

> **Lưu ý**: Không lạm dụng SOS khi không có tình huống khẩn cấp thực sự.

### 2.4 Theo dõi trạng thái sự cố

- **Cách 1**: Trong App → tab **Lịch sử** → chọn sự cố cần xem.
- **Cách 2**: Truy cập web `https://yourdomain.com/track` → nhập mã theo dõi → xem không cần đăng nhập.

Các trạng thái sự cố:

| Trạng thái | Ý nghĩa |
|-----------|---------|
| PENDING | Đang chờ phân công đội cứu hộ |
| OFFERING | Hệ thống đang gửi đề xuất tới đội gần nhất |
| ASSIGNED | Đội cứu hộ đã xác nhận, đang di chuyển |
| ARRIVED | Đội cứu hộ đã đến hiện trường |
| PROCESSING | Đang xử lý sự cố |
| COMPLETED | Sự cố đã được giải quyết |
| CANCELLED | Sự cố đã bị huỷ |

### 2.5 Chat với điều phối viên

1. Vào sự cố đang xử lý → tab **Trò chuyện**.
2. Nhập tin nhắn và gửi — điều phối viên sẽ nhận ngay tức thì.

---

## 3. Đội cứu hộ

### 3.1 Đăng nhập

Tài khoản đội cứu hộ do Admin tạo sẵn. Lần đầu đăng nhập:
1. Nhập email và mật khẩu tạm thời được cấp.
2. Hệ thống yêu cầu **đổi mật khẩu ngay** → nhập mật khẩu mới (≥ 8 ký tự, có chữ hoa và số).
3. Đăng nhập lại bằng mật khẩu mới.

### 3.2 Bật trạng thái sẵn sàng (Online)

> Đội cứu hộ chỉ nhận nhiệm vụ khi ở trạng thái **ONLINE**.

1. Vào tab **Tài khoản** → bật **Trạng thái: Sẵn sàng (Online)**.
2. App sẽ gửi vị trí GPS định kỳ để hệ thống biết vị trí thực.

### 3.3 Nhận và xử lý nhiệm vụ

Khi có sự cố gần khu vực, App sẽ hiển thị **thông báo đề xuất nhiệm vụ** gồm:
- Loại sự cố, mức độ nghiêm trọng.
- Khoảng cách đến hiện trường (km).
- Thời gian dự kiến đến (ETA).

**Xử lý đề xuất** (trong vòng 35 giây):

- Nhấn **Chấp nhận**: Hệ thống phân công chính thức, hiển thị đường đi trên bản đồ.
- Nhấn **Từ chối**: Hệ thống tìm đội khác.
- Không phản hồi (quá 35s): Tự động từ chối, tìm đội khác.

**Cập nhật tiến trình sau khi chấp nhận**:

1. Di chuyển đến hiện trường → nhấn **Đã đến nơi** (`ARRIVED`).
2. Bắt đầu xử lý → nhấn **Đang xử lý** (`PROCESSING`).
3. Hoàn thành → nhấn **Hoàn thành** (`COMPLETED`).

### 3.4 GPS Tracking

- App tự động gửi GPS khi ở trạng thái ONLINE và đang xử lý nhiệm vụ.
- Điều phối viên nhìn thấy vị trí xe trực tiếp trên bản đồ.
- Đảm bảo cấp quyền **Vị trí luôn bật** cho App để tracking chính xác.

### 3.5 Chat với điều phối viên / người dân

- Tab **Trò chuyện** trong nhiệm vụ đang thực hiện.
- Nhắn tin, nhận thông tin bổ sung về hiện trường từ người dân.

---

## 4. Điều phối viên

### 4.1 Đăng nhập Web Portal

Truy cập `https://yourdomain.com` → nhập email + mật khẩu (tài khoản do Admin cấp).

### 4.2 Màn hình chính — Bản đồ thời gian thực

- **Marker đỏ/cam/vàng/xanh**: Sự cố theo mức độ nghiêm trọng (CRITICAL / HIGH / MEDIUM / LOW).
- **Marker xanh lá / cam / xám**: Đội cứu hộ (AVAILABLE / BUSY / OFFLINE).
- **Đường màu xanh**: Lộ trình OSRM từ đội cứu hộ đến hiện trường.

Click vào marker sự cố để xem chi tiết và thao tác.

### 4.3 Tiếp nhận sự cố qua điện thoại

Khi nhận cuộc gọi báo sự cố:
1. Tab **Sự cố** → nhấn **+ Tạo mới**.
2. Chọn loại, mức độ, nhập mô tả, chọn vị trí trên bản đồ Leaflet.
3. Nhấn **Tạo sự cố** → hệ thống tự động phân công đội gần nhất.

### 4.4 Phân công thủ công

Nếu cần can thiệp tay:
1. Mở chi tiết sự cố → nhấn **Phân công thủ công**.
2. Chọn đội cứu hộ từ danh sách (lọc theo khu vực, tình trạng).
3. Xác nhận → đội nhận thông báo ngay.

### 4.5 Theo dõi sự cố đang xử lý

- Bảng **Sự cố** bên trái hiển thị toàn bộ danh sách theo trạng thái.
- Màu badge: Đỏ = PENDING/OFFERING, Cam = ASSIGNED/ARRIVED, Xanh = PROCESSING, Xám = COMPLETED.
- Click vào sự cố → panel bên phải hiển thị timeline đầy đủ.

### 4.6 Chat với người dân / đội cứu hộ

Trong panel chi tiết sự cố → tab **Trò chuyện** → nhắn tin thời gian thực qua Socket.IO.

### 4.7 Quản lý đội cứu hộ (Fleet)

Tab **Đội xe** → xem danh sách, tình trạng, vị trí GPS của từng đội hiện tại.

---

## 5. Quản trị viên

### 5.1 Dashboard tổng quan

- KPI cards: Tổng sự cố, Đang xử lý, Tỷ lệ hoàn thành, Thời gian phản hồi TB.
- Biểu đồ Recharts: phân bố theo loại, trạng thái, xu hướng theo thời gian.
- Heatmap: điểm nóng sự cố trên bản đồ.

### 5.2 Quản lý đội cứu hộ

Tab **Admin → Đội cứu hộ**:
- **Thêm đội**: Tên, khu vực phụ trách, năng lực (xe tải/xe cẩu/...), thêm thành viên.
- **Sửa**: Click vào đội → sửa thông tin.
- **Vô hiệu hoá**: Toggle trạng thái Active/Inactive.

### 5.3 Quản lý tài khoản người dùng

Tab **Admin → Người dùng**:
- Tạo tài khoản mới (Dispatcher, Rescue) — tài khoản tự động nhận email với mật khẩu tạm thời.
- Khoá/mở tài khoản.
- Reset mật khẩu.

### 5.4 Báo cáo & Xuất dữ liệu

Tab **Admin → Báo cáo**:
- Lọc theo khoảng thời gian, loại sự cố, đội cứu hộ.
- Biểu đồ đường (xu hướng), biểu đồ cột (so sánh).
- Nhấn **Xuất Excel** → tải file `.xlsx` với toàn bộ dữ liệu báo cáo.

### 5.5 Cấu hình hệ thống

Tab **Admin → Cấu hình**:
- **Bán kính tìm đội** (km): bán kính tìm kiếm đội cứu hộ gần nhất mặc định.
- **Thời gian chờ đề xuất** (giây): thời gian đội cứu hộ có để phản hồi (mặc định 35s).
- **Chế độ bảo trì**: bật để tạm dừng hệ thống với mọi user (trừ Admin).

---

## 6. Xử lý sự cố thường gặp

| Vấn đề | Nguyên nhân có thể | Cách khắc phục |
|--------|-------------------|----------------|
| App không lấy được GPS | Chưa cấp quyền vị trí | Vào Cài đặt điện thoại → Ứng dụng → Cho phép Vị trí |
| Sự cố mãi ở PENDING | Không có đội nào ONLINE trong khu vực | Dispatcher phân công thủ công hoặc chờ đội khác online |
| Không nhận được thông báo | FCM token chưa được lưu | Đăng xuất → đăng nhập lại để làm mới FCM token |
| Web Portal hiển thị trắng | Token hết hạn | Xoá cookies → đăng nhập lại |
| Bản đồ không tải được | Mất kết nối mạng | Kiểm tra kết nối internet |
| Đội từ chối → không tìm được đội khác | Không còn đội AVAILABLE | Dispatcher kiểm tra Fleet và liên hệ thủ công |

---

*Mọi thắc mắc hỗ trợ, liên hệ Quản trị viên hệ thống.*
