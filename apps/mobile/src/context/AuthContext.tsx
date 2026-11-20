import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { EducationSelection, SessionUser } from '../../../../packages/contracts';
import { ApiError, requestApi, type Api } from '../services/api';

const storageKey = 'edushare-session';
type Session = { token: string; user: SessionUser };
type Credentials = { email: string; password: string };
type Registration = Credentials & EducationSelection & { name: string };
type AuthState = {
  token: string;
  user: SessionUser | null;
  restoredUser: SessionUser | null;
  api: Api;
  signIn: (mode: 'login' | 'register', data: Credentials | Registration) => Promise<Session>;
  signOut: () => Promise<void>;
  updateUser: (user: SessionUser) => void;
};
const AuthContext = createContext<AuthState | null>(null);

function validateUser(user: SessionUser) {
  if (user?.role !== 'student' && user?.role !== 'admin') {
    throw new Error('API chưa trả về vai trò tài khoản. Cập nhật mã nguồn và khởi động lại API EduShare.');
  }
  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [restoredUser, setRestoredUser] = useState<SessionUser | null>(null);
  const current = useRef<Session | null>(null);
  const revision = useRef(0);
  const writes = useRef(Promise.resolve());

  const storeToken = useCallback((token?: string) => {
    const next = writes.current.catch(() => {}).then(() =>
      token ? AsyncStorage.setItem(storageKey, token) : AsyncStorage.removeItem(storageKey));
    writes.current = next;
    return next;
  }, []);

  const replace = useCallback((session: Session | null) => {
    current.current = session;
    setSession(session);
  }, []);

  const clear = useCallback((token: string) => {
    if (current.current?.token !== token) return Promise.resolve();
    revision.current += 1;
    replace(null);
    setRestoredUser(null);
    return storeToken();
  }, [replace, storeToken]);

  useEffect(() => {
    let active = true;
    const initial = revision.current;
    void (async () => {
      const token = await AsyncStorage.getItem(storageKey);
      if (!token || !active || initial !== revision.current) return;
      try {
        const user = validateUser(await requestApi<SessionUser>('/me', 'GET', undefined, token));
        if (active && initial === revision.current) {
          replace({ token, user });
          setRestoredUser(user);
        }
      } catch (error) {
        if (active && initial === revision.current && error instanceof ApiError && [401, 403].includes(error.status)) {
          await storeToken();
        }
      }
    })().catch(() => { /* Allow login when local storage or the API is unavailable. */ });
    return () => { active = false; };
  }, [replace, storeToken]);

  const token = session?.token || '';
  const api = useCallback<Api>(async (path, method, data, requestToken = token) => {
    try {
      return await requestApi(path, method, data, requestToken);
    } catch (error) {
      if (requestToken && error instanceof ApiError && error.status === 401) {
        await clear(requestToken).catch(() => {});
      }
      throw error;
    }
  }, [clear, token]);

  const signIn = useCallback(async (mode: 'login' | 'register', data: Credentials | Registration) => {
    const attempt = ++revision.current;
    const next = await requestApi<Session>('/auth/' + mode, 'POST', data);
    validateUser(next.user);
    if (attempt !== revision.current) throw new Error('Phiên đăng nhập đã thay đổi.');
    await storeToken(next.token);
    if (attempt !== revision.current) throw new Error('Phiên đăng nhập đã thay đổi.');
    setRestoredUser(null);
    replace(next);
    return next;
  }, [replace, storeToken]);

  const signOut = useCallback(async () => {
    const token = current.current?.token;
    if (!token) return;
    try {
      await requestApi('/auth/logout', 'POST', undefined, token);
    } catch (error) {
      if (!(error instanceof ApiError) || ![401, 403].includes(error.status)) throw error;
    }
    await clear(token);
  }, [clear]);

  const updateUser = useCallback((user: SessionUser) => {
    const session = current.current;
    if (session?.user.id === user.id) replace({ ...session, user });
  }, [replace]);

  const value = useMemo(() => ({
    token, user: session?.user ?? null, restoredUser, api, signIn, signOut, updateUser,
  }), [token, session, restoredUser, api, signIn, signOut, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider chưa được gắn vào ứng dụng.');
  return value;
}
