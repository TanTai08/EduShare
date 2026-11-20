import type { Listing, PublicUser, SessionUser } from '../../../../packages/contracts';

export type LibraryData = { rows: Listing[]; saved: string[]; recent: string[]; acquired: string[] };

export type User = SessionUser;
export type ModerationNotice = { id: string; title: string; action: string; note?: string; createdAt: string };
export type AiTurn = { question: string; answer: string; sources: { id: string; title: string }[] };
export type Deal = { _id: string; doc: string; buyer: string; seller: string; type: string; price: number; time: string; location: string; status: string; confirmations: string[]; counterparty?: PublicUser; document?: { title: string; cover?: string } };
export type Message = { _id: string; from: string; text: string };
export type Point = { _id: string; amount: number; reason: string };
export type Review = { _id: string; rating: number; text: string };
export type Page = 'welcome' | 'login' | 'register' | 'home' | 'detail' | 'publish' | 'preview' | 'posted' | 'account' | 'saved' | 'mine' | 'wallet' | 'deals' | 'appointment' | 'inbox' | 'chat' | 'profile' | 'assistant' | 'report' | 'edit' | 'review' | 'region' | 'notifications' | 'dealProgress' | 'pdfOpened' | 'reportSent';
export const status: Record<string, string> = { requested: 'Chờ người đăng xác nhận', scheduled: 'Đã hẹn', waiting: 'Chờ bên còn lại xác nhận', completed: 'Hoàn tất', cancelled: 'Đã hủy', pending: 'Chờ duyệt', approved: 'Đã duyệt', revision: 'Cần sửa', rejected: 'Đã từ chối', removed: 'Đã gỡ', remove: 'Đã gỡ' };
export const money = (n: number) => n.toLocaleString('vi-VN') + ' ₫';
export const price = (doc: Listing) => {
  if (doc.type === 'digital') return 'Miễn phí';
  if (doc.fulfilled) return doc.type === 'sale' ? 'Đã bán' : 'Đã đổi';
  return doc.type === 'sale' ? money(doc.price) : doc.price + ' điểm';
};
export const searchable = (value: string) => value.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll('đ', 'd');
export const emptyLibrary: LibraryData = { rows: [], saved: [], acquired: [], recent: [] };
export const blank = { title: '', subject: '', category: '', description: '', cost: '', fileUrl: '', cover: '', pdf: '', fileName: '' };
