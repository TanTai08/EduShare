import { Platform, Share } from 'react-native';
import type { Api, Page } from './models';

const csvCell = (value: string | number) => {
  const raw = String(value);
  const safe = /^[\s]*[=+\-@\t\r]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replaceAll('"', '""') + '"';
};
export async function exportCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  if (Platform.OS !== 'web') {
    await Share.share({ title: filename, message: csv });
    return;
  }
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportList<T>(api: Api, route: string, queryString: string, output: string, headers: string[], values: (row: T) => (string | number)[]) {
  const rows: (string | number)[][] = [headers];
  const batch = 100;
  for (let n = 1; ; n++) {
    const data = await api<Page<T>>(route + '?' + queryString + '&page=' + n + '&limit=' + batch);
    rows.push(...data.rows.map(values));
    if (n * batch >= data.total || !data.rows.length) break;
  }
  await exportCsv(output, rows);
}
