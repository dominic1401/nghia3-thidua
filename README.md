# Bảng thi đua lớp Nghĩa 3 · 2026–2027

Chủ đề năm học: **Môn đệ nhỏ loan Tin Mừng**

| Trang | Ai dùng | Làm gì |
|---|---|---|
| `index.html` | Cả lớp, phụ huynh, chiếu máy chiếu | Bảng xếp hạng đội + tab Chuyên cần / Học tập / Kỷ luật |
| `huynhtruong.html` | Huynh Trưởng (PIN HT) | Chấm Học tập & Kỷ luật theo tuần, xem chi tiết điểm danh từng đội |
| `doitruong.html` | Đội trưởng (PIN đội) | Điểm danh đội mình sáng Chúa Nhật; HT cũng dùng được để điểm danh thay |

Dữ liệu nằm trong Google Sheet danh sách lớp (thêm 3 sheet `DiemDanh`, `ChamDiem`, `CaiDat`). Web chỉ là giao diện.

**Cách tính:** mỗi tiêu chí thang 10. Chuyên cần = tỉ lệ có mặt × 10 (tự động từ điểm danh). Điểm tuần = 30% CC + 50% HT + 20% KL. Xếp hạng theo tổng lũy kế cả năm. Trọng số đổi được trong sheet `CaiDat`.

---

## Triển khai lần đầu (≈10 phút)

### Bước 1 – Backend trên Google Sheet

1. Mở Google Sheet **DANH SÁCH LỚP NGHĨA 3 (2026-2027)**.
2. Menu **Extensions → Apps Script**. Xoá nội dung có sẵn, dán toàn bộ file `Code.gs`, bấm **Save**.
3. Trong thanh công cụ chọn hàm `setup` → **Run**. Google sẽ hỏi cấp quyền → Review permissions → chọn tài khoản → Advanced → Go to (unsafe) → Allow. Sau khi chạy, sheet sẽ có thêm 3 tab `DiemDanh`, `ChamDiem`, `CaiDat`.
4. **Deploy → New deployment**:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Deploy → copy **Web app URL** (dạng `https://script.google.com/macros/s/…/exec`).
5. Mở tab `CaiDat`, **đổi các PIN** (PIN_HT, PIN_DOI1…4). PIN mặc định chỉ để thử.

> Mỗi lần sửa `Code.gs` sau này: Deploy → Manage deployments → Edit (bút chì) → Version: New version → Deploy. URL giữ nguyên.

### Bước 2 – Gắn URL vào web

Mở `config.js`, dán URL vào:

```js
window.NGHIA3_API_URL = "https://script.google.com/macros/s/…/exec";
```

(Không sửa cũng được: trang sẽ hỏi URL lần đầu mở và nhớ trên trình duyệt đó. Nhưng nên dán vào để Đội trưởng không phải nhập.)

### Bước 3 – Đưa lên GitHub

1. github.com → **New repository** → tên `nghia3-thidua`, Public hoặc Private đều được → Create.
2. Bấm **uploading an existing file** → kéo thả tất cả file trong thư mục này (`index.html`, `huynhtruong.html`, `doitruong.html`, `app.js`, `style.css`, `config.js`, `vercel.json`, `README.md`, `.gitignore`; `Code.gs` để kèm cho tiện tra cứu) → **Commit changes**.

### Bước 4 – Deploy Vercel

1. vercel.com → **Add New → Project** → Import repo `nghia3-thidua`.
2. Framework preset: **Other**. Không cần cài đặt gì thêm → **Deploy**.
3. Nhận link dạng `https://nghia3-thidua.vercel.app`. Có thể vào Settings → Domains để đổi tên cho dễ nhớ.

Từ đây, mỗi lần commit file mới lên GitHub, Vercel tự deploy lại trong ~30 giây.

### Bước 5 – Phát link

- Cả lớp: `https://…vercel.app/`
- Huynh Trưởng: `https://…vercel.app/huynhtruong`
- Đội trưởng: `https://…vercel.app/doitruong` (gửi kèm PIN đội qua Zalo)

Trên điện thoại, Đội trưởng nên **Thêm vào màn hình chính** để mở nhanh mỗi Chúa Nhật.

---

## Quy trình mỗi Chúa Nhật

1. Đầu giờ: Đội trưởng mở trang điểm danh, tick từng em, bấm **Lưu điểm danh**. Em vắng có thể ghi chú "có phép".
2. Cuối giờ: HT mở trang chấm điểm, chọn Chúa Nhật, nhập Học tập và Kỷ luật (0–10) cho 4 đội, bấm **Lưu điểm tuần này**.
3. Bảng thi đua tự cập nhật (tự làm mới 5 phút/lần khi để mở).

## Tuỳ chỉnh

- **Danh sách lớp:** sửa trực tiếp sheet đầu tiên. Ghi `NGHỈ LUÔN` ở cột Trạng thái để loại khỏi điểm danh; `ĐỘI TRƯỞNG` / `ĐỘI PHÓ` để hiện vai trò.
- **Chủ đề, trọng số, ngày bắt đầu, PIN:** sheet `CaiDat`.
- **Sửa điểm tay:** sửa trực tiếp sheet `DiemDanh` / `ChamDiem` (ngày ghi dạng `yyyy-mm-dd`).
- **Màu đội:** `TEAM_COLORS` ở đầu file `app.js`.

## Lỗi thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| "Không tải được dữ liệu" | URL Apps Script sai hoặc deployment chưa để **Anyone**. Bấm "nhập lại URL" trên trang. |
| PIN đúng mà vẫn báo sai | Kiểm tra ô GiaTri trong `CaiDat` không có khoảng trắng thừa. |
| Sửa `Code.gs` mà web không đổi | Chưa tạo **New version** trong Manage deployments. |
| Điểm danh không lưu | Đội trưởng dùng PIN của đội khác; hoặc mất mạng lúc bấm Lưu – bấm lại. |
