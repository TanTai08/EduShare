# EduShare

Ứng dụng chia sẻ tài liệu sinh viên theo [prototype Figma](https://www.figma.com/design/1TBNsCoYyKMCeiEmglE1c8?node-id=15-11).

- **Android và web**: React Native, Expo Router và React Native Web dùng chung giao diện.
- **API**: Node.js, Express, TypeScript và Mongoose.
- **Dữ liệu dùng chung**: `packages/contracts` chứa kiểu và danh sách trường mẫu.

## Clone và mở bằng VS Code

Cài Node.js 22 LTS trở lên và Git, rồi mở Terminal:

```sh
git clone https://github.com/TanTai08/EduShare.git
cd EduShare
npm ci
code .
```

Nếu chưa bật lệnh `code`, dùng **File → Open Folder** trong VS Code để mở thư mục EduShare.

## Kết nối MongoDB Atlas

1. Tạo project và cluster trên [MongoDB Atlas](https://www.mongodb.com/atlas). Atlas chạy online nên bạn không cần cài MongoDB Server trên máy.
2. Tạo Database User riêng với quyền đọc/ghi của database `edushare`. Thêm IP máy đang chạy API trong Network Access.
3. Chọn **Connect → Drivers → Node.js** và sao chép URI. Tạo `apps/api/.env` từ `apps/api/.env.example`, rồi đặt URI vào đó:

   ```dotenv
   PORT=4000
   MONGODB_URI=mongodb+srv://DB_USER:DB_PASSWORD@CLUSTER_HOST/edushare
   ```

   Dùng giá trị từ Atlas và giữ tham số query Atlas cung cấp nếu có. Nếu mật khẩu chứa ký tự đặc biệt, mã hóa ký tự đó theo URL trước khi ghép URI. File `.env` được bỏ qua bởi Git. Chỉ backend đọc URI.

4. Mở hai terminal trong thư mục gốc:

   ```sh
   npm run api
   ```

   ```sh
   npm run mobile
   ```

   Mở `http://localhost:4000/health` để kiểm tra `database: "connected"`. Khi thiếu URI, API vẫn trả `not_configured` tại `/health`, còn các thao tác cần MongoDB trả 503.

5. Với Android Emulator, ứng dụng dùng mặc định `http://10.0.2.2:4000`. Với điện thoại thật, sao chép `apps/mobile/.env.example` thành `apps/mobile/.env` và đổi `EXPO_PUBLIC_API_URL` thành `http://IP_LAN_CUA_MAY:4000`; điện thoại và máy tính phải cùng mạng. Khởi động lại Expo sau khi đổi biến môi trường. Chạy `npm run web` để mở phiên bản trình duyệt.

Các luồng giữ, hoàn và thưởng điểm dùng MongoDB transaction. Nếu chạy MongoDB tại máy thay cho Atlas, cấu hình replica set và thêm tên replica set vào URI. Có thể dùng Atlas Data Explorer hoặc Compass để xem collection. MongoDB tạo collection khi backend khởi tạo model hoặc ghi dữ liệu.

## Dùng thử nghiệp vụ

1. Đăng ký hai tài khoản thuộc các trường cùng khu vực để thử giao nhận. Có thể tạo tài khoản thứ ba thuộc Huế để thử giới hạn khu vực.
2. Đăng một PDF miễn phí bằng tệp PDF tối đa 3 MB hoặc liên kết HTTPS, hoặc đăng bản in có giá hoặc số điểm. Bài mới ở trạng thái chờ duyệt.
3. Muốn thử duyệt, đặt trường `role` của một tài khoản thử nghiệm thành `admin` trong collection `users` bằng Atlas Data Explorer. Dùng mục **Duyệt bài** trong hồ sơ của tài khoản đó.
4. Bên nhận đặt hẹn, bên giao chấp nhận, sau đó hai bên xác nhận giao nhận. Tiền được trả trực tiếp. Với nhánh điểm, số điểm được trừ khi đặt hẹn và hoàn nếu hủy trước khi bên nào xác nhận giao nhận. Hệ thống cộng điểm thưởng khi hoàn tất.
5. Thử thẻ người đăng, chat, lưu tài liệu, đánh giá sau giao dịch và báo cáo bằng ảnh.

## AI và phạm vi hiện tại

Đặt `OPENAI_API_KEY` trong `apps/api/.env` để dùng đọc ảnh bìa và trợ lý tài liệu. Giữ khóa ở backend. Bạn vẫn có thể nhập thông tin tài liệu thủ công. Trợ lý hiện dùng thông tin danh mục, chưa đọc toàn văn PDF.

Bản đầu dùng email và mật khẩu; chưa có Google/Facebook OAuth hay khôi phục mật khẩu. Ảnh được lưu dạng dữ liệu ảnh nhỏ trong MongoDB; bài PDF hỗ trợ tệp nhỏ lưu trong MongoDB hoặc liên kết HTTPS. Chat cập nhật theo chu kỳ, chưa dùng WebSocket. Các màn có luồng nghiệp vụ chính và dùng bảng màu từ Figma; phần giao diện được triển khai theo phạm vi MVP.

```sh
npm run check
```
