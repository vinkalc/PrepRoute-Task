import { create } from 'zustand'

interface User {
  id?: string;
  username?: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Read initial state from localStorage safely
  const storedToken = localStorage.getItem('preproute_auth_token');
  let storedUser: User | null = null;
  try {
    const userStr = localStorage.getItem('preproute_auth_user');
    if (userStr) {
      storedUser = JSON.parse(userStr);
    }
  } catch (e) {
    console.error('Error parsing stored user data', e);
  }

  return {
    token: storedToken,
    user: storedUser,
    isAuthenticated: !!storedToken,
    login: (token: string, user: User) => {
      localStorage.setItem('preproute_auth_token', token);
      localStorage.setItem('preproute_auth_user', JSON.stringify(user));
      set({ token, user, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('preproute_auth_token');
      localStorage.removeItem('preproute_auth_user');
      set({ token: null, user: null, isAuthenticated: false });
    },
  };
});
