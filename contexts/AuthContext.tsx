// contexts/AuthContext.tsx
'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';

interface User {
  id: number;
  username: string;
  email: string;
  telefono: string; 
  first_name?: string;
  last_name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

interface RegisterData {
  username: string;
  email: string;
  telefono: string;  // ← AGREGAR
  password: string;
  first_name?: string;
  last_name?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Cargar token al iniciar
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Refresh token automático cada 30 min
  useEffect(() => {
    if (!token) return;
    
    const interval = setInterval(async () => {
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const data = await api.refreshToken(refreshToken);
          if (data.access) {
            setToken(data.access);
            localStorage.setItem('token', data.access);
          }
        }
      } catch (err) {
        console.error('Error refreshing token:', err);
        logout();
      }
    }, 30 * 60 * 1000); // 30 minutos

    return () => clearInterval(interval);
  }, [token]);

  // Redirigir rutas protegidas
  useEffect(() => {
    const protectedPaths = ['/mis-citas', '/perfil', '/citas/confirmar'];
    const isProtected = protectedPaths.some(path => pathname?.startsWith(path));
    
    if (isProtected && !token && !loading) {
      router.push('/auth/login');
    }
  }, [pathname, token, loading, router]);

  const login = async (username: string, password: string) => {
    try {
      const data = await api.login(username, password);
      
      if (data.access && data.refresh) {
        setToken(data.access);
        localStorage.setItem('token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        
        // Obtener datos del usuario
        const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api'}/user/me/`, {
          headers: { 'Authorization': `Bearer ${data.access}` }
        });
        
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
        router.push('/mis-citas');
      }
    } catch (err: any) {
      throw new Error(err.message || 'Credenciales inválidas');
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api'}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Error al registrar');
      }
      
      // Auto-login después del registro
      await login(data.username, data.password);
    } catch (err: any) {
      throw new Error(err.message || 'Error al registrar');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      isAuthenticated: !!token,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}