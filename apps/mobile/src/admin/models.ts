import type { Listing, PublicUser } from '../../../../packages/contracts';

export type { Api } from '../services/api';
export type Member = Partial<PublicUser> & { id: string; name: string; email: string; role: string; status: string; createdAt?: string };
export type AccountDetail = Member & { posts: number; deals: number; rating?: number; reviewCount: number };
export type Post = Omit<Listing, 'owner'> & { owner: PublicUser | null; createdAt?: string; submittedAt?: string;
  history?: { _id: string; action: string; note?: string; createdAt: string }[] };
export type Report = { id: string; title: string; reason: string; description: string; status: string; priority: string;
  createdAt?: string; image?: string; document?: Post | null; reporter?: PublicUser; note?: string; resolution?: string };
export type Page<T> = { rows: T[]; total: number };
export type Overview = { users: number; active: number; restricted: number; locked: number; approved: number;
  pending: number; pendingToday: number; revision: number; reports: number; reviewing: number; high: number; categories: string[] };
type Count = { count: number; previous: number };
export type Stats = { from: string; to: string; members: Count; posts: Count; opens: Count; resolved: Count;
  timeline: { date: string; members: number; posts: number }[]; categories: { name: string; count: number }[];
  schools: { name: string; members: number; posts: number }[]; averageHours: number | null; firstApproval: number | null };
export const labels: Record<string, string> = {
  pending: 'Chờ duyệt', approved: 'Đã duyệt', revision: 'Cần chỉnh sửa', rejected: 'Đã từ chối', removed: 'Đã gỡ',
  active: 'Hoạt động', restricted: 'Hạn chế', locked: 'Đã khóa', student: 'Thành viên', admin: 'Quản trị viên',
  open: 'Đang mở', reviewing: 'Đang xử lý', resolved: 'Đã xử lý', high: 'Ưu tiên cao', normal: 'Thông thường',
  dismiss: 'Đã bỏ qua', remove: 'Đã gỡ bài',
};
export const number = (n: number) => n.toLocaleString('vi-VN');
export const date = (value?: string) => value ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
export const dateTime = (value?: string) => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
export const price = (post: Post) => post.type === 'digital' ? 'Miễn phí' : number(post.price) + (post.type === 'sale' ? ' ₫' : ' điểm');
export const shortId = (id: string, prefix: string) => '#' + prefix + id.slice(-6).toUpperCase();
