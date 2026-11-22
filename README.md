# Korean Master – 나의 한국어 공부
### Ứng dụng Web Học Tiếng Hàn Cá Nhân Hoàn Chỉnh & Hiện Đại

---

## 1. Giới thiệu

**Korean Master – 나의 한국어 공부** là nền tảng web cá nhân hóa giúp bạn tự quản lý và học tiếng Hàn một cách khoa học, chuyên nghiệp và có chiều sâu. Ứng dụng được thiết kế theo phong cách tối giản, hiện đại với tone màu Trắng, Xanh dương nhạt và Xanh Navy, hỗ trợ hoàn hảo hiển thị tiếng Việt và bảng chữ cái Hangul tiếng Hàn.

Ứng dụng lưu trữ dữ liệu thực tế lâu dài, cho phép bạn tự do thêm, sửa, xóa, phân loại theo giáo trình (ví dụ: *Tiếng Hàn Tổng Hợp Sơ Cấp 1, 2...*), luyện phản xạ qua Flashcard 3D, ôn tập lặp lại ngắt quãng (Spaced Repetition SM-2), kiểm tra trắc nghiệm & tự luận qua 8 dạng đề thi chuyên sâu và tra cứu từ điển cá nhân độc lập.

---

## 2. Công nghệ sử dụng

- **Frontend & Full-stack Framework:** Next.js 14 (App Router) + TypeScript
- **Styling & UI:** Tailwind CSS, Lucide React Icons, Canvas Confetti
- **Phát âm Tiếng Hàn (TTS):** Web Speech API (`SpeechSynthesis`)
- **Biểu đồ & Thống kê:** Recharts
- **Xử lý File Excel / CSV:** SheetJS (`xlsx`)
- **Cơ sở dữ liệu & ORM:** Prisma ORM
  - Mặc định: SQLite (chạy ngay lập tức trên máy tính, không cần cài đặt thêm phần mềm máy chủ nặng nề, dữ liệu bền vững trong file `dev.db`).
  - Hỗ trợ đầy đủ: PostgreSQL (đã chuẩn bị sẵn file cấu hình `prisma/schema.postgresql.prisma` chuẩn hóa 100%).

---

## 3. Cấu trúc thư mục dự án

```text
app-hoc-tieng-han/
├── prisma/
│   ├── dev.db                      # File cơ sở dữ liệu SQLite cục bộ
│   ├── schema.prisma               # Schema chính (SQLite / PostgreSQL)
│   ├── schema.postgresql.prisma    # Schema chuẩn hóa dành riêng cho PostgreSQL
│   └── seed.ts                     # Script khởi tạo dữ liệu mẫu chuẩn giáo trình
├── src/
│   ├── app/
│   │   ├── api/                    # Hệ thống API Routes chuẩn RESTful
│   │   │   ├── backup/             # Xuất / Nhập sao lưu toàn bộ DB (JSON)
│   │   │   ├── curriculum/         # CRUD Giáo trình, Chương, Bài học
│   │   │   ├── dashboard/          # Thống kê KPI, Streak, biểu đồ 7 ngày
│   │   │   ├── dictionary/         # Tra cứu từ điển Hàn - Việt nội bộ
│   │   │   ├── flashcards/         # Lấy thẻ & ghi nhận kết quả Flashcard
│   │   │   ├── grammar/            # CRUD Ngữ pháp & So sánh ngữ pháp
│   │   │   ├── quiz/               # Tạo bài test 8 dạng & chấm điểm
│   │   │   │   └── history/        # Lịch sử bài test & thống kê câu hay sai
│   │   │   ├── review/             # Lấy danh sách từ đến hạn ôn SRS
│   │   │   ├── settings/           # Cấu hình người dùng & mục tiêu ngày
│   │   │   ├── topics/             # Quản lý chủ đề
│   │   │   └── vocabulary/         # CRUD Từ vựng, Thêm hàng loạt, Xuất Excel/CSV
│   │   ├── globals.css             # Thiết lập hiệu ứng 3D lật thẻ & typography
│   │   ├── layout.tsx              # Root Layout & Toast Provider
│   │   └── page.tsx                # Giao diện chính điều hướng Sidebar & Dashboard
│   ├── components/                 # Các Module Giao diện
│   │   ├── Sidebar.tsx             # Menu thanh bên (Responsive Mobile + Desktop)
│   │   ├── DashboardView.tsx       # Bảng điều khiển tổng quan & Biểu đồ tiến độ
│   │   ├── VocabularyManager.tsx   # Quản lý từ vựng, Nhập/Xuất Excel/CSV
│   │   ├── GrammarManager.tsx      # Quản lý ngữ pháp, Công thức & So sánh
│   │   ├── FlashcardStudy.tsx      # Thẻ ghi nhớ 3D lật thẻ + Phím tắt Space/1/2/3
│   │   ├── SmartReviewSRS.tsx      # Ôn tập lặp lại ngắt quãng (SM-2 Spaced Repetition)
│   │   ├── QuizPractice.tsx        # Hệ thống kiểm tra 8 dạng đề thi & thống kê lỗi
│   │   ├── GrammarHandbook.tsx     # Sổ tay ngữ pháp & Đánh dấu yêu thích
│   │   ├── PersonalDictionary.tsx  # Từ điển cá nhân tra cứu tức thì
│   │   ├── CurriculumManager.tsx   # Quản lý phân cấp: Giáo trình -> Chương -> Bài
│   │   ├── SettingsBackup.tsx      # Thiết lập mục tiêu & Sao lưu / Khôi phục
│   │   └── Toast.tsx               # Hệ thống thông báo nổi (Toast notifications)
│   ├── lib/
│   │   ├── prisma.ts               # Prisma Client Singleton
│   │   ├── speech.ts               # Bộ phát âm tiếng Hàn chuẩn bản xứ
│   │   └── srs.ts                  # Thuật toán SM-2 tính toán chu kỳ ôn tập
│   └── types/
│       └── index.ts                # TypeScript interfaces và types
├── package.json
└── tailwind.config.ts
```

---

## 4. Hướng dẫn Cài đặt & Chạy ứng dụng

### Yêu cầu tiên quyết:
- Đã cài đặt **Node.js** (khuyến nghị phiên bản 18 trở lên hoặc Node.js 20).

### Bước 1: Mở Terminal tại thư mục dự án
```powershell
cd e:\app-linh-tinh\app-hoc-tieng-han
```

### Bước 2: Cài đặt thư viện phụ thuộc (nếu tải mới mã nguồn)
```powershell
npm install
```

### Bước 3: Đồng bộ cơ sở dữ liệu & Nạp dữ liệu mẫu
Hệ thống sử dụng SQLite cục bộ giúp bạn không phải tốn công cài đặt PostgreSQL server:
```powershell
# Đồng bộ cấu trúc bảng vào database
npx prisma db push

# Nạp dữ liệu mẫu ban đầu từ Giáo trình Tiếng Hàn Tổng Hợp 1 (Chương 1 & Bài 1, 2)
npx tsx prisma/seed.ts
```

### Bước 4: Khởi chạy ứng dụng
Chạy ở chế độ Phát triển (Development):
```powershell
npm run dev
```
Hoặc chạy ở chế độ Production tối ưu tốc độ:
```powershell
npm run build
npm run start
```

Mở trình duyệt web và truy cập địa chỉ: **`http://localhost:3000`**

---

## 5. Hướng dẫn Chuyển đổi sang PostgreSQL (Tùy chọn)

Nếu bạn muốn kết nối với máy chủ cơ sở dữ liệu **PostgreSQL** (chạy trên Docker hoặc PostgreSQL cài trên Windows):

1. Mở file `.env` và sửa chuỗi kết nối:
   ```env
   DATABASE_URL="postgresql://postgres:mat_khau@localhost:5432/korean_master?schema=public"
   ```
2. Sao chép nội dung từ file `prisma/schema.postgresql.prisma` sang `prisma/schema.prisma` (chỉ khác dòng `provider = "postgresql"`).
3. Đẩy schema lên database PostgreSQL:
   ```powershell
   npx prisma db push
   npx tsx prisma/seed.ts
   ```
Toàn bộ code backend và query Prisma hoàn toàn tương thích và hoạt động mượt mà không cần sửa đổi bất kỳ dòng code nào!

---

## 6. Hướng dẫn Sử dụng Chi tiết các Chức năng

### A. Dashboard – Bảng điều khiển Tổng quan
- Xem các chỉ số quan trọng: Tổng từ vựng đã lưu, số từ đã thuộc, số từ đang học, tổng ngữ pháp đã vững.
- Theo dõi **Chuỗi ngày học liên tiếp (Streak)** được tự động tính toán dựa trên hoạt động mỗi ngày.
- **Biểu đồ Recharts:** Xem khối lượng từ vựng và số lượt ôn tập trong 7 ngày gần nhất.
- Nút tắt dẫn nhanh đến: Học Flashcard, Ôn tập hôm nay, Thêm nhanh từ vựng / ngữ pháp.

### B. Quản lý Từ vựng (CRUD & Nhập/Xuất File)
- **Thêm từ vựng:** Điền từ tiếng Hàn, phiên âm, nghĩa tiếng Việt, từ loại, câu ví dụ tiếng Hàn + dịch nghĩa, chủ đề, bài học và ghi chú mẹo nhớ.
- **Thêm liên tiếp (Continuous Add):** Cho phép nhập liên tục nhiều từ mà không bị đóng form, giữ nguyên chủ đề và bài học đã chọn.
- **Phát âm tiếng Hàn (Speaker icon):** Tích hợp Web Speech API phát âm chuẩn xác ngữ điệu tiếng Hàn.
- **Nhập từ file Excel/CSV:** Nhấn nút "Nhập file", chọn file `.xlsx` hoặc `.csv` có sẵn cột "Từ tiếng Hàn", "Nghĩa tiếng Việt", "Ví dụ"... xem trước bảng dữ liệu rồi bấm xác nhận để đưa vào kho.
- **Xuất file:** Nhấn nút "Xuất Excel" để tải file `.xlsx` toàn bộ từ vựng lưu trữ về máy.

### C. Quản lý Ngữ pháp & So sánh Ngữ pháp
- Lưu trữ đầy đủ: Cấu trúc (ví dụ: `-(으)려고 하다`), Ý nghĩa tiếng Việt, Cách dùng chi tiết, **Công thức kết hợp với V / A / N**, Điều kiện & Trường hợp ngoại lệ, Ví dụ minh họa và Các cấu trúc tương tự dễ nhầm.
- **Công cụ So sánh ngữ pháp (Compare Mode):** Tích chọn 2 hoặc 3 cấu trúc ngữ pháp rồi nhấn nút "So sánh" để mở bảng đối chiếu song song từng tiêu chí (Công thức, Cách dùng, Ngoại lệ, Ví dụ).

### D. Học Flashcard 3D Tương tác
- Chọn học theo danh mục: Tất cả từ vựng, Từ mới chưa thuộc, Thẻ khó/đã đánh dấu sao, Theo chủ đề, Theo từng bài học, hoặc Học ngẫu nhiên.
- **Hiệu ứng lật thẻ 3D:** Mặt trước hiển thị Tiếng Hàn lớn, mặt sau hiển thị Nghĩa tiếng Việt, ví dụ câu và phân loại từ.
- **Hỗ trợ phím tắt:**
  - Nhấn phím `Space` hoặc `Enter`: Lật thẻ.
  - Nhấn phím `1`: Chưa nhớ (Again).
  - Nhấn phím `2`: Khó nhớ (Hard).
  - Nhấn phím `3`: Đã nhớ (Good).
- Hiệu ứng pháo hoa rực rỡ ăn mừng khi bạn hoàn thành toàn bộ xấp thẻ!

### E. Chế độ Ôn tập Thông minh (Spaced Repetition SM-2)
- Tự động lọc ra các từ cần ôn hôm nay (`due today`).
- Mỗi lần bạn đánh giá (Chưa nhớ / Khó nhớ / Nhớ tốt / Rất dễ), thuật toán SM-2 sẽ tính toán lại mức độ dễ nhớ (`easeFactor`) và khoảng cách thời gian ôn tập tiếp theo (1 ngày, 2 ngày, 7 ngày, 14 ngày, 30 ngày...).
- Toàn bộ trạng thái và ngày ôn tập tiếp theo được lưu thực sự vào database, không bị mất khi tải lại trang.

### F. Luyện tập & Kiểm tra (8 Dạng Đề Thi Chuyên Sâu)
Hỗ trợ đầy đủ 8 dạng bài kiểm tra theo yêu cầu:
1. **Dạng 1:** Tiếng Hàn → Chọn nghĩa tiếng Việt.
2. **Dạng 2:** Tiếng Việt → Chọn từ tiếng Hàn.
3. **Dạng 3:** Điền từ còn thiếu vào câu ví dụ.
4. **Dạng 4:** Viết nghĩa tiếng Việt (Gõ tự luận).
5. **Dạng 5:** Nhìn nghĩa tiếng Việt và tự gõ từ tiếng Hàn (Luyện gõ Hangul).
6. **Dạng 6:** Trắc nghiệm nhận biết ý nghĩa ngữ pháp.
7. **Dạng 7:** Điền cấu trúc ngữ pháp phù hợp vào câu.
8. **Dạng 8:** Chọn câu sử dụng ngữ pháp chính xác.
- Tự do tùy chỉnh số lượng câu (5, 10, 15, 20 câu) và lọc theo chủ đề hoặc bài học.
- **Sau khi nộp bài:** Xem điểm số, số câu đúng/sai, so sánh câu trả lời của bạn với đáp án đúng, đọc phần giải thích chi tiết dựa trên dữ liệu đã học.
- **Tab Lịch sử:** Lưu lại kết quả các bài kiểm tra và thống kê danh sách những từ vựng/ngữ pháp hay trả lời sai nhất.

### G. Sổ tay Ngữ pháp
- Giao diện dạng sổ tay tra cứu thẻ hai cột (Danh sách bên trái, Nội dung chi tiết bên phải).
- Tìm kiếm nhanh, lọc theo trạng thái (Đã nắm vững / Đang học / Chưa học) và lọc các cấu trúc được gắn sao yêu thích.

### H. Từ điển Cá nhân Nội bộ
- Tìm kiếm tức thì theo tiếng Hàn hoặc tiếng Việt với độ trễ cực thấp.
- Gợi ý từ khóa tự động (Autocomplete chips).
- Trả về đồng thời cả Từ vựng liên quan và Cấu trúc ngữ pháp liên quan.
- Có nút phát âm và nút sao chép nhanh vào clipboard.

### I. Quản lý Giáo trình & Bài học
- Cấu trúc phân cấp chuẩn: **Giáo trình → Chương → Bài học**.
- Tự do tạo giáo trình mới (ví dụ: *Tiếng Hàn Tổng Hợp Sơ Cấp 1, Sơ Cấp 2, Seoul Korean...*).
- Hiển thị số lượng từ vựng và ngữ pháp trực thuộc mỗi bài học.

### J. Cài đặt & Sao lưu Dữ liệu Toàn diện
- Điều chỉnh mục tiêu số từ mới và số lượt ôn tập mỗi ngày.
- **Tải file sao lưu (JSON):** Tải toàn bộ dữ liệu cơ sở dữ liệu (từ vựng, ngữ pháp, bài học, lịch sử ôn tập, lịch sử thi) về lưu trữ an toàn.
- **Khôi phục dữ liệu:** Chọn file JSON đã sao lưu để khôi phục lại dữ liệu bất cứ lúc nào.
- **Xóa sạch dữ liệu (Reset):** Cho phép dọn dẹp sạch kho từ vựng/ngữ pháp mẫu để bạn bắt đầu nhập dữ liệu học tập của riêng mình.
