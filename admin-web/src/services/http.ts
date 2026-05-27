import axios from 'axios';
import { useAuthStore } from '../stores/auth';

export const http = axios.create({
  baseURL: '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
http.interceptors.request.use(
  (config) => {
    const { token, user } = useAuthStore.getState();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (user?.tenantId) {
      config.headers['X-Tenant-Id'] = String(user.tenantId);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 响应拦截器
http.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 401 错误处理
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const { refreshToken } = useAuthStore.getState();
      if (refreshToken) {
        try {
          const response = await axios.post('/api/admin/v1/auth/refresh', {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data.data;
          useAuthStore.setState({
            token: access_token,
            refreshToken: refresh_token,
          });

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return http(originalRequest);
        } catch (refreshError) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);
