import { z } from 'zod';
import {
  isListingPdfUrl, listingPriceErrors, listingPriceLimits, listingTextError, type ListingTextField,
} from '../../../../../packages/contracts/index.js';
import { image, text } from '../../validation.js';

function requiredText(key: ListingTextField) {
  const required = listingTextError(key, '');
  return z.string({ required_error: required, invalid_type_error: required }).trim().superRefine((value, ctx) => {
    const message = listingTextError(key, value);
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  });
}
const url = z.string().trim().refine(isListingPdfUrl, 'Vui lòng nhập liên kết PDF bắt đầu bằng HTTPS hợp lệ.');
export const listing = z.object({
  title: requiredText('title'), subject: requiredText('subject'),
  category: requiredText('category'), description: requiredText('description'),
  type: z.enum(['digital', 'sale', 'points']),
  price: z.number({ invalid_type_error: 'Giá bán hoặc số điểm phải là số.' }).default(0),
  cover: image.optional(), fileUrl: url.optional(),
  fileName: text(160).optional(),
  pdf: z.string().max(4_200_000, 'Tệp PDF quá lớn.').regex(/^JVBERi0[A-Za-z0-9+/=]+$/, 'Tệp đính kèm không phải PDF hợp lệ.').optional(),
}).superRefine(({ type, price, fileUrl, pdf }, ctx) => {
  if (type === 'digital') {
    if (price !== 0) ctx.addIssue({ code: 'custom', path: ['price'], message: 'Tài liệu tải miễn phí phải có giá bằng 0.' });
    if (!fileUrl && !pdf) ctx.addIssue({ code: 'custom', path: ['fileUrl'], message: 'Vui lòng chọn tệp PDF hoặc nhập liên kết HTTPS.' });
    return;
  }
  if (!Number.isInteger(price) || price < 1 || price > listingPriceLimits[type]) {
    ctx.addIssue({ code: 'custom', path: ['price'], message: listingPriceErrors[type] });
  }
  if (fileUrl || pdf) ctx.addIssue({ code: 'custom', path: ['fileUrl'], message: 'Tệp PDF chỉ dùng cho tài liệu tải miễn phí.' });
});
