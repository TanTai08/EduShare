import { createHash, randomBytes, scryptSync } from 'node:crypto';
import mongoose, { Types } from 'mongoose';
import { models } from './models.js';

const accounts = [
  { email: 'demo.danang@edushare.example', name: 'Nguyễn Minh Anh', schoolId: 'vku' },
  { email: 'demo.buyer@edushare.example', name: 'Trần Lan Phương', schoolId: 'dut' },
  { email: 'demo.hue@edushare.example', name: 'Lê Bảo Nam', schoolId: 'husc' },
];
const listings = [
  { key: 'dn-sale', owner: 0, title: 'Giáo trình Cấu trúc dữ liệu', subject: 'Cấu trúc dữ liệu', category: 'Giáo trình', description: 'Giáo trình bản in. Hẹn nhận tại thư viện trường.', type: 'sale', price: 25000 },
  { key: 'dn-points', owner: 0, title: 'Slide Lập trình Java', subject: 'Lập trình Java', category: 'Slide bản in', description: 'Bộ slide in dành cho sinh viên cùng khu vực.', type: 'points', price: 20 },
  { key: 'pdf', owner: 0, title: 'Đề thi Xác suất thống kê', subject: 'Xác suất thống kê', category: 'Đề thi PDF', description: 'Đề ôn tập mẫu có thể mở miễn phí ở mọi khu vực.', type: 'digital', price: 0 },
  { key: 'hue-sale', owner: 2, title: 'Giáo trình Cơ sở dữ liệu', subject: 'Cơ sở dữ liệu', category: 'Giáo trình', description: 'Bản in giao nhận tại Huế.', type: 'sale', price: 30000 },
  { key: 'hue-points', owner: 2, title: 'Đề cương Mạng máy tính', subject: 'Mạng máy tính', category: 'Đề cương bản in', description: 'Đổi điểm và nhận tại trường ở Huế.', type: 'points', price: 15 },
];
const demoId = (key: string) => new Types.ObjectId(createHash('sha256').update('edushare-demo:v1:' + key).digest('hex').slice(0, 24));
function samplePdf() {
  const stream = 'BT /F1 22 Tf 48 748 Td (EduShare - De on tap mau) Tj /F1 12 Tf 0 -36 Td (1. Tinh ky vong va phuong sai cua bien ngau nhien.) Tj 0 -24 Td (2. Neu vi du ve phan phoi nhi thuc.) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream',
  ];
  let file = '%PDF-1.4\n';
  const offsets = objects.map((object, index) => {
    const offset = file.length;
    file += (index + 1) + ' 0 obj\n' + object + '\nendobj\n';
    return offset;
  });
  const start = file.length;
  file += 'xref\n0 6\n0000000000 65535 f \n' + offsets.map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('');
  return Buffer.from(file + 'trailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n' + start + '\n%%EOF\n');
}
async function seed() {
  const uri = process.env.MONGODB_URI;
  const password = process.env.DEMO_PASSWORD;
  if (!uri || !password || password.length < 8 || password.length > 128) {
    throw new Error('Đặt MONGODB_URI và DEMO_PASSWORD (8–128 ký tự) trong apps/api/.env.');
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 6000 });
  await Promise.all([models.users.init(), models.docs.init(), models.points.init()]);
  await mongoose.connection.transaction(async session => {
    for (const account of accounts) {
      const id = demoId(account.email);
      const current = await models.users.findOne({ email: account.email }).session(session);
      if (current && !current._id.equals(id)) throw new Error('Email demo đã được dùng bởi tài khoản khác.');
      if (current) continue;
      const salt = randomBytes(16).toString('hex');
      await models.users.create([{ ...account, _id: id, password: salt + ':' + scryptSync(password, salt, 64).toString('hex'), points: 50 }], { session });
      await models.points.create([{ key: 'demo:initial:' + id, user: String(id), amount: 50, reason: 'Điểm khởi tạo tài khoản mẫu' }], { session });
    }
    for (const { key, owner, ...listing } of listings) {
      const file = listing.type === 'digital' ? { fileName: 'de-on-tap-mau.pdf', pdf: samplePdf() } : {};
      await models.docs.updateOne({ _id: demoId(key) }, { $setOnInsert: { ...listing, ...file, owner: String(demoId(accounts[owner].email)), status: 'approved' } }, { upsert: true, session, timestamps: false });
    }
  });
  console.log('Đã chuẩn bị dữ liệu mẫu trong database ' + mongoose.connection.name + '.');
  for (const { email } of accounts) console.log(email);
  console.log('Dùng DEMO_PASSWORD đã đặt lúc chạy seed lần đầu.');
}
seed().catch(error => {
  const message = error instanceof Error ? error.message : '';
  console.error(message.startsWith('Đặt ') || message.startsWith('Email demo ') ? message : 'Không tạo được dữ liệu mẫu. Kiểm tra kết nối MongoDB và replica set.');
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
