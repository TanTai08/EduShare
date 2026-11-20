import type { IconName } from './ui';

type Tab = 'overview' | 'posts' | 'users' | 'reports' | 'stats';
export type ViewName = Tab | 'settings';
export type Confirm = { title: string; description: string; label: string; danger?: boolean; action: () => Promise<void> };
export const nav: { key: Tab; title: string; icon: IconName }[] = [
  { key: 'overview', title: 'Tổng quan', icon: 'grid-outline' },
  { key: 'posts', title: 'Duyệt bài', icon: 'document-text-outline' },
  { key: 'users', title: 'Người dùng', icon: 'people-outline' },
  { key: 'reports', title: 'Báo cáo', icon: 'flag-outline' },
  { key: 'stats', title: 'Thống kê', icon: 'bar-chart-outline' },
];
export const headings: Record<ViewName, { title: string; subtitle: string }> = {
  overview: { title: 'Tổng quan', subtitle: 'Theo dõi hoạt động và các việc cần xử lý trong cộng đồng EduShare.' },
  posts: { title: 'Duyệt bài đăng', subtitle: 'Kiểm tra chất lượng và quyền chia sẻ trước khi xuất bản.' },
  users: { title: 'Người dùng', subtitle: 'Quản lý tài khoản và theo dõi hoạt động của thành viên.' },
  reports: { title: 'Báo cáo vi phạm', subtitle: 'Xem minh chứng và ghi lại quyết định xử lý.' },
  stats: { title: 'Thống kê', subtitle: 'Theo dõi tăng trưởng, tài liệu và kết quả kiểm duyệt.' },
  settings: { title: 'Cài đặt hệ thống', subtitle: 'Thông tin phiên quản trị EduShare.' },
};
