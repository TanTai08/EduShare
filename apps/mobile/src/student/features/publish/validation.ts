import {
  isListingPdfUrl, listingPriceErrors, listingPriceLimits, listingTextError, listingTextKeys, type ListingTextField, type ListingType,
} from '../../../../../../packages/contracts';
import type { blank } from '../../models';

type PublishField = ListingTextField | 'cost' | 'fileUrl';
export type PublishErrors = Partial<Record<PublishField, string>>;

export function validatePublish(form: typeof blank, type: ListingType, keepsExistingPdf: boolean): PublishErrors {
  const errors: PublishErrors = {};
  for (const key of listingTextKeys) {
    const error = listingTextError(key, form[key]);
    if (error) errors[key] = error;
  }
  if (type === 'digital') {
    const fileUrl = form.fileUrl.trim();
    if (fileUrl && !isListingPdfUrl(fileUrl)) {
      errors.fileUrl = 'Vui lòng nhập liên kết PDF bắt đầu bằng HTTPS hợp lệ.';
    } else if (!fileUrl && !form.pdf && !keepsExistingPdf) {
      errors.fileUrl = 'Vui lòng chọn tệp PDF hoặc nhập liên kết HTTPS.';
    }
  } else {
    const amount = Number(form.cost);
    if (!Number.isInteger(amount) || amount < 1 || amount > listingPriceLimits[type]) errors.cost = listingPriceErrors[type];
  }
  return errors;
}
