import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { authAPI, setUnauthorizedHandler } from '../services/api';
import { storage } from '../services/storage';
import type { User, RegisterData } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    await storage.clearAll();
    setUser(null);
    setToken(null);
  }, []);

  // Register the 401 handler once so the API service can trigger logout
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
  }, [logout]);

  // Auto-login: restore session from AsyncStorage on app start
  useEffect(() => {
    async function restoreSession() {
      try {
        const savedToken = await storage.getToken();
        const savedUser = await storage.getUser<User>();
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(savedUser);
        }
      } catch {
        // Silently ignore — user will need to log in
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authAPI.login(email, password);
    await storage.saveToken(result.access_token);
    await storage.saveUser(result.user);
    setToken(result.access_token);
    setUser(result.user);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const result = await authAPI.register(data);
    await storage.saveToken(result.access_token);
    await storage.saveUser(result.user);
    setToken(result.access_token);
    setUser(result.user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
