import type { Listing } from '../../../packages/contracts';

export const sample: Listing[] = [
  { id: 'sample-sale', title: 'Giáo trình Cấu trúc dữ liệu', subject: 'Cấu trúc dữ liệu', category: 'Giáo trình', description: 'Giáo trình bản in dùng ôn tập cây, đồ thị và thuật toán sắp xếp.', type: 'sale', price: 25000, status: 'approved', owner: { id: 'sample-minh', name: 'Nguyễn Minh Anh', school: 'ĐH CNTT & TT Việt – Hàn', region: 'Đà Nẵng' } },
  { id: 'sample-pdf', title: 'Đề thi Xác suất thống kê', subject: 'Xác suất thống kê', category: 'Đề thi PDF', description: 'Đề thi minh họa cho giao diện EduShare.', type: 'digital', price: 0, status: 'approved', owner: { id: 'sample-phuong', name: 'Trần Lan Phương', school: 'ĐH Bách khoa Đà Nẵng', region: 'Đà Nẵng' } },
  { id: 'sample-slide', title: 'Slide Lập trình Java', subject: 'Lập trình Java', category: 'Slide bản in', description: 'Slide Java bản in dành cho sinh viên cùng khu vực.', type: 'points', price: 20, status: 'approved', owner: { id: 'sample-nam', name: 'Lê Bảo Nam', school: 'ĐH Khoa học, Đại học Huế', region: 'Huế' } },
];
