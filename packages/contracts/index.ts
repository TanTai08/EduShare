export const schools = [
  { id: 'vku', name: 'ĐH CNTT & TT Việt – Hàn', region: 'Đà Nẵng' },
  { id: 'dut', name: 'ĐH Bách khoa Đà Nẵng', region: 'Đà Nẵng' },
  { id: 'husc', name: 'ĐH Khoa học, Đại học Huế', region: 'Huế' },
  { id: 'hueedu', name: 'ĐH Sư phạm, Đại học Huế', region: 'Huế' },
] as const;

export const academicRegions = [
  { id: 'da-nang', name: 'Đà Nẵng' },
  { id: 'hue', name: 'Huế' },
] as const;
export type AcademicRegion = typeof academicRegions[number];
export type AcademicSchool = { id: string; name: string; region: string };
export type AcademicMajor = {
  id: string; code?: string; name: string; specializations: { id: string; name: string }[];
};
export type EducationSelection = { schoolId: string; majorId?: string; specializationId?: string };

export type ListingType = 'digital' | 'sale' | 'points';
export type DealStatus = 'requested' | 'scheduled' | 'waiting' | 'completed' | 'cancelled';
export type PublicUser = { id: string; name: string; school: string; region: string; avatar?: string };
export type SessionUser = PublicUser & { points: number; saved: string[]; role: 'student' | 'admin'; schoolId?: string; majorId?: string; major?: string; specializationId?: string; specialization?: string };
export type Listing = {
  id: string; title: string; subject: string; category: string; description: string;
  type: ListingType; price: number; cover?: string; fileUrl?: string; fileName?: string; owner: PublicUser;
  fulfilled?: boolean;
  status: 'pending' | 'approved' | 'revision' | 'rejected' | 'removed'; feedback?: string;
};
export const listingLabels: Record<ListingType, string> = {
  digital: 'Tải miễn phí', sale: 'Bán bản in', points: 'Nhận bằng điểm',
};

export const listingTextFields = {
  title: { label: 'Tên tài liệu', max: 130 },
  subject: { label: 'Môn học', max: 90 },
  category: { label: 'Danh mục', max: 70 },
  description: { label: 'Mô tả', max: 1200 },
} as const;
export type ListingTextField = keyof typeof listingTextFields;
export const listingTextKeys = Object.keys(listingTextFields) as ListingTextField[];

export function listingTextError(key: ListingTextField, value: string) {
  const { label, max } = listingTextFields[key];
  if (!value.trim()) return 'Vui lòng điền ' + label.toLocaleLowerCase('vi') + '.';
  if (value.trim().length > max) return label + ' tối đa ' + max + ' ký tự.';
}

export const listingPriceLimits = { sale: 100_000_000, points: 1_000 };
export const listingPriceErrors = {
  sale: 'Giá bán phải là số nguyên từ 1 đến 100.000.000 đồng.',
  points: 'Điểm cần dùng phải là số nguyên từ 1 đến 1.000.',
};

export function isListingPdfUrl(value: string) {
  if (value.length > 2_000) return false;
  try {
    const url = new URL(value);
    return /^https:\/\//i.test(value) && url.protocol === 'https:' && !!url.hostname;
  } catch {
    return false;
  }
}
