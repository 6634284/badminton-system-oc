import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { http } from '../services/http';

interface AuthUser {
  userId: number;
  tenantId: number | null;
  permissions: string[];
  menuTree: any[];
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  switchTenant: (tenantId: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,

      login: async (username: string, password: string) => {
        const response = await http.post('/api/admin/v1/auth/login', {
          username,
          password,
        });

        const { access_token, refresh_token, user_id } = response.data.data;

        set({
          token: access_token,
          refreshToken: refresh_token,
          user: {
            userId: user_id,
            tenantId: null,
            permissions: [],
            menuTree: [],
          },
        });
      },

      logout: () => {
        set({
          token: null,
          refreshToken: null,
          user: null,
        });
      },

      switchTenant: (tenantId: number) => {
        const { user } = get();
        if (user) {
          set({
            user: {
              ...user,
              tenantId,
            },
          });
        }
      },
    }),
    {
      name: 'auth-storage',
    },
  ),
);
