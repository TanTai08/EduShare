export const schools = [
  { id: 'vku', name: 'ĐH CNTT & TT Việt – Hàn', region: 'Đà Nẵng' },
  { id: 'dut', name: 'ĐH Bách khoa Đà Nẵng', region: 'Đà Nẵng' },
  { id: 'husc', name: 'ĐH Khoa học, Đại học Huế', region: 'Huế' },
  { id: 'hueedu', name: 'ĐH Sư phạm, Đại học Huế', region: 'Huế' },
] as const;

export type ListingType = 'digital' | 'sale' | 'points';
export type DealStatus = 'requested' | 'scheduled' | 'waiting' | 'completed' | 'cancelled';
export type PublicUser = { id: string; name: string; school: string; region: string; avatar?: string };
export type SessionUser = PublicUser & { points: number; saved: string[]; role: 'student' | 'admin' };
export type Listing = {
  id: string; title: string; subject: string; category: string; description: string;
  type: ListingType; price: number; cover?: string; fileUrl?: string; fileName?: string; owner: PublicUser;
  status: 'pending' | 'approved' | 'revision' | 'rejected' | 'removed'; feedback?: string;
};
export const listingLabels: Record<ListingType, string> = {
  digital: 'Tải miễn phí', sale: 'Bán bản in', points: 'Nhận bằng điểm',
};
