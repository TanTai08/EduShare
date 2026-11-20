import { useEffect, useState } from 'react';
import type { Api } from './models';
import type { Resource } from './screenParts';

export function useData<T>(api: Api, path: string, version: number): Resource<T> {
  const [result, setResult] = useState<{ key: string; data?: T; error?: string }>();
  const key = path + '\n' + version;
  useEffect(() => {
    if (!path) return;
    let active = true;
    void api<T>(path).then(data => { if (active) setResult({ key, data }); })
      .catch(error => { if (active) setResult({ key, error: error instanceof Error ? error.message : 'Không tải được dữ liệu.' }); });
    return () => { active = false; };
  }, [api, path, key]);
  return result?.key === key ? result : {};
}
export function useDebounced(value: string) {
  const [current, setCurrent] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setCurrent(value.trim()), 275);
    return () => clearTimeout(timer);
  }, [value]);
  return current;
}
