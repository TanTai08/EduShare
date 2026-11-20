import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import type { DocumentPickerAsset } from 'expo-document-picker';

export async function readPickedPdf(picked: DocumentPickerAsset) {
  const web = Platform.OS === 'web';
  try {
    if ((picked.size ?? 0) > 3_000_000) throw new Error('Tệp PDF vượt quá 3 MB.');
    let pdf: string;
    if (web) {
      const file = picked.file;
      if (!file) throw new Error('Không đọc được tệp PDF. Hãy chọn lại tệp.');
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        const fail = () => reject(new Error('Không đọc được tệp PDF. Hãy chọn lại tệp.'));
        reader.onerror = fail;
        reader.onabort = fail;
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : fail();
        reader.readAsDataURL(file);
      });
      pdf = dataUrl.slice(dataUrl.indexOf(',') + 1);
    } else {
      pdf = await new File(picked.uri).base64();
    }
    if (pdf.length > 4_000_000) throw new Error('Tệp PDF vượt quá 3 MB.');
    if (!pdf.startsWith('JVBERi0')) throw new Error('Tệp đính kèm không phải PDF hợp lệ.');
    return pdf;
  } finally {
    if (web && picked.uri.startsWith('blob:')) URL.revokeObjectURL(picked.uri);
  }
}
