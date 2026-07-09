import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { authApi } from '../api/authApi';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  checkAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Auto-authenticate on load from storage
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const savedToken = localStorage.getItem('school_erp_token');
      const savedUser = localStorage.getItem('school_erp_user');
      const savedRole = localStorage.getItem('school_erp_role') as Role;

      if (savedToken && savedUser && savedRole) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        setRole(savedRole);
        setIsAuthenticated(true);
        
        // Background verify/sync session state with active cookie
        try {
          const profileRes = await authApi.getCurrentUser();
          if (profileRes && profileRes.user) {
            setUser(profileRes.user);
            setRole(profileRes.user.role);
            localStorage.setItem('school_erp_user', JSON.stringify(profileRes.user));
            localStorage.setItem('school_erp_role', profileRes.user.role);
          }
        } catch (syncErr) {
          console.warn('Background cookie validation sync failed:', syncErr);
        }
      } else {
        // Fallback for cookie-only JWT auth on load
        try {
          const profileRes = await authApi.getCurrentUser();
          if (profileRes && profileRes.user) {
            const tempToken = 'session-cookie-approved';
            setToken(tempToken);
            setUser(profileRes.user);
            setRole(profileRes.user.role);
            setIsAuthenticated(true);
            
            localStorage.setItem('school_erp_token', tempToken);
            localStorage.setItem('school_erp_user', JSON.stringify(profileRes.user));
            localStorage.setItem('school_erp_role', profileRes.user.role);
          }
        } catch (cookieErr) {
          // No active cookie session found, stay on logged out state
        }
      }
    } catch (e) {
      console.error('Failed to parse saved session:', e);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      
      if (data && data.user) {
        const tokenVal = data.token || 'session-bearer-approved';
        localStorage.setItem('school_erp_token', tokenVal);
        localStorage.setItem('school_erp_user', JSON.stringify(data.user));
        localStorage.setItem('school_erp_role', data.user.role);
        
        setToken(tokenVal);
        setUser(data.user);
        setRole(data.user.role);
        setIsAuthenticated(true);
        
        return data.user;
      } else {
        throw new Error('Malformed server response');
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || 'Login failed';
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authApi.logout().catch(err => console.warn('Backend logout failed:', err));
    localStorage.removeItem('school_erp_token');
    localStorage.removeItem('school_erp_user');
    localStorage.removeItem('school_erp_role');
    
    setToken(null);
    setUser(null);
    setRole(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, role, isAuthenticated, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
};
