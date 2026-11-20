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

## Cấu trúc mã nguồn

```text
EduShare/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── app.ts          # Express, middleware và đăng ký route
│   │   │   ├── server.ts       # Khởi động API và kết nối MongoDB
│   │   │   ├── config/
│   │   │   ├── middlewares/
│   │   │   ├── models.ts       # Schema Mongoose
│   │   │   ├── modules/       # Các nghiệp vụ API
│   │   │   └── seed.ts
│   │   └── test/
│   └── mobile/
│       ├── app/               # Điểm vào Expo Router
│       └── src/
│           ├── admin/
│           ├── components/    # Nút và ô nhập liệu dùng chung
│           ├── context/       # Phiên đăng nhập
│           ├── services/      # Gọi API và xử lý lỗi HTTP
│           └── student/
│               └── features/  # Các màn hình theo nghiệp vụ
├── packages/contracts/        # Kiểu dữ liệu và danh mục trường dùng chung
└── tsconfig.base.json
```

Trong API, các module gồm tài khoản, hồ sơ, tài liệu, giao dịch, tin nhắn, điểm, thông báo, đánh giá, báo cáo, quản trị, AI và danh mục trường. Đặt endpoint mới trong `routes.ts` của module tương ứng. Tách xử lý sang `service.ts` khi cần chia sẻ logic hoặc quản lý nhiều bước như giao dịch và điểm.

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
3. Muốn thử duyệt, đặt trường `role` của một tài khoản thử nghiệm thành `admin` trong collection `users` bằng Atlas Data Explorer. Đăng nhập lại để mở **Quản trị EduShare**, rồi dùng mục **Duyệt bài**. Dùng tài khoản sinh viên riêng để đăng tài liệu và giao nhận.
4. Bên nhận đặt hẹn, bên giao chấp nhận, sau đó hai bên xác nhận giao nhận. Tiền được trả trực tiếp. Với nhánh điểm, số điểm được trừ khi đặt hẹn và hoàn nếu hủy trước khi bên nào xác nhận giao nhận. Hệ thống cộng điểm thưởng khi hoàn tất.
5. Thử thẻ người đăng, chat, lưu tài liệu, đánh giá sau giao dịch và báo cáo bằng ảnh.

## AI và phạm vi hiện tại

Đặt `OPENAI_API_KEY` trong `apps/api/.env` để dùng đọc ảnh bìa và trợ lý tài liệu. Giữ khóa ở backend. Bạn vẫn có thể nhập thông tin tài liệu thủ công. Trợ lý hiện dùng thông tin danh mục, chưa đọc toàn văn PDF.

Bản đầu dùng email và mật khẩu; chưa có Google/Facebook OAuth hay khôi phục mật khẩu. Ảnh được lưu dạng dữ liệu ảnh nhỏ trong MongoDB; bài PDF hỗ trợ tệp nhỏ lưu trong MongoDB hoặc liên kết HTTPS. Chat cập nhật theo chu kỳ, chưa dùng WebSocket. Các màn có luồng nghiệp vụ chính và dùng bảng màu từ Figma; phần giao diện được triển khai theo phạm vi MVP.

## Kiểm tra mã nguồn

```sh
npm run check
npm test
```

`npm run check` kiểm tra kiểu TypeScript cho các workspace. `npm test` khởi động Express trên cổng tạm để kiểm tra danh mục trường, trạng thái API và phản hồi khi thiếu MongoDB.

## Danh mục trường và ngành học

API tự nạp danh mục có sẵn của Đà Nẵng vào MongoDB khi khởi động. Nếu hai collection danh mục gặp lỗi, API ghi rõ bước gặp lỗi và vẫn dùng dữ liệu đi kèm khi MongoDB cùng các chỉ mục chính đã sẵn sàng. Bộ dữ liệu được đọc từ nguồn tuyển sinh và trang chương trình đào tạo của các trường. Các mã trường từng dùng cho tài khoản hiện có được giữ nguyên. Hồ sơ sinh viên chọn khu vực, trường hoặc cơ sở, ngành học rồi đến chuyên ngành nếu có. Danh mục Huế vẫn gồm các trường EduShare đã hỗ trợ. Sinh viên có thể bổ sung ngành khi danh mục trường được cập nhật.

Để đọc nguồn mới và xem số mục tìm được, chạy ở thư mục gốc.

```sh
npm run catalog:sync
```

Chọn từng nguồn hoặc xuất JSON để xem trước khi cập nhật.

```sh
npm run catalog:sync -- --source donga --source vku --output catalog-preview.json
npm run catalog:sync -- --source donga --source vku --apply
```

Đặt `MONGODB_URI` trong `apps/api/.env` như khi chạy API. Sau khi nhập, khởi động lại API để tải các mục mới. Nguồn và quy tắc đọc nằm trong `apps/api/src/modules/academic/sources.ts`. Tệp xuất có đường dẫn nguồn cho từng mục. Khi một nguồn gặp lỗi, script báo tên nguồn, vẫn nhập những nguồn đọc được nếu dùng `--apply`, và giữ dữ liệu đã có. Có thể dùng `npm run catalog:sync -- --bundled --apply` để nhập bộ dữ liệu đi kèm.

Danh mục hiện phủ các cơ sở đã xác minh được dữ liệu. Một số nguồn chỉ công bố các ngành thuộc một chương trình hoặc có cấu trúc riêng. Có thể bổ sung nguồn cho các trường và chương trình còn thiếu mà không phải nhập tay từng dòng.

## Tạo dữ liệu mẫu trên MongoDB

Đặt `DEMO_PASSWORD` từ 8 ký tự trong `apps/api/.env` cùng với `MONGODB_URI`. Từ thư mục gốc chạy:

```sh
npm run seed:demo
```

Lệnh chuẩn bị 10 tài khoản sinh viên tại Đà Nẵng và Huế, mỗi tài khoản mới có 50 điểm ban đầu và một bài chờ duyệt. Ngoài 10 bài chờ duyệt, có 5 bài đã duyệt để thử Trang chủ. Chạy lại giữ nguyên tài khoản, số dư, mật khẩu và trạng thái các bài đã tạo.

| Email đăng nhập | Khu vực | Dùng để thử |
| --- | --- | --- |
| `demo.danang@edushare.example` | Đà Nẵng | Người đăng |
| `demo.buyer@edushare.example` | Đà Nẵng | Mua và đổi điểm |
| `demo.hue@edushare.example` | Huế | Danh sách Huế và giới hạn giao nhận |

Bảy tài khoản bổ sung dùng email từ `demo04@edushare.example` đến `demo10@edushare.example`. Dùng mật khẩu bạn đặt khi mỗi tài khoản được tạo lần đầu. Nếu đang đăng nhập tài khoản thật, đăng xuất để đổi sang tài khoản mẫu.
