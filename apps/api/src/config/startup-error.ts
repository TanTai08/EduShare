type Stage = 'connection' | 'indexes' | 'catalog-seed' | 'catalog-read';

const stageLabels: Record<Stage, string> = {
  connection: 'Kết nối MongoDB',
  indexes: 'Khởi tạo chỉ mục chính',
  'catalog-seed': 'Ghi danh mục trường và ngành vào MongoDB',
  'catalog-read': 'Đọc danh mục trường và ngành từ MongoDB',
};

export function startupError(stage: Stage, error: unknown) {
  const details = typeof error === 'object' && error !== null ? error : {};
  const code = 'code' in details ? details.code : undefined;
  const name = 'name' in details ? details.name : undefined;
  let reason = 'Kiểm tra cấu hình và quyền của tài khoản MongoDB.';
  if (code === 13) reason = 'Tài khoản MongoDB thiếu quyền trên database đang dùng.';
  if (code === 18 || code === 8000) reason = 'Kiểm tra thông tin đăng nhập Database User và database xác thực trong MongoDB Atlas.';
  if (code === 85 || code === 86) reason = 'Chỉ mục hiện có khác cấu hình của ứng dụng.';
  if (code === 11000) reason = 'Có dữ liệu hoặc khóa bị trùng.';
  if ((!code && (name === 'MongooseServerSelectionError' || name === 'MongoServerSelectionError')) ||
    code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEOUT') {
    reason = 'Kiểm tra cluster, Network Access và kết nối mạng.';
  }
  const codeText = typeof code === 'number' && Number.isSafeInteger(code) ? ' (mã ' + code + ')' : '';
  return stageLabels[stage] + ' thất bại' + codeText + '. ' + reason;
}
