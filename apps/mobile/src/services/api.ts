import { Platform } from 'react-native';

export const endpoint = process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');

export type Api = <T>(path: string, method?: string, data?: unknown, token?: string) => Promise<T>;

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const requestApi: Api = async <T>(path: string, method = 'GET', data?: unknown, token?: string): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(endpoint + path, {
      method,
      headers: {
        ...(token && { Authorization: 'Bearer ' + token }),
        ...(data !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  } catch {
    throw new Error('Không thể kết nối máy chủ.');
  }

  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
      ? body.error : 'Máy chủ chưa xử lý được yêu cầu.';
    throw new ApiError(response.status, message);
  }
  if (body === undefined) throw new Error('Máy chủ trả dữ liệu không hợp lệ.');
  return body as T;
};
