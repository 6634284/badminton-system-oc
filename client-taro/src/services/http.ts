import Taro from '@tarojs/taro';

const BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000'
  : 'https://api.example.com';

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  header?: Record<string, string>;
}

export const http = {
  request: async (options: RequestOptions) => {
    const token = Taro.getStorageSync('token');
    const header: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.header,
    };

    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await Taro.request({
        url: `${BASE_URL}${options.url}`,
        method: options.method || 'GET',
        data: options.data,
        header,
      });

      if (response.statusCode === 401) {
        // Token过期，跳转登录
        Taro.removeStorageSync('token');
        Taro.removeStorageSync('refresh_token');
        Taro.redirectTo({
          url: '/pages/login/index',
        });
        throw new Error('未登录');
      }

      if (response.statusCode >= 400) {
        throw new Error(response.data?.msg || '请求失败');
      }

      return response;
    } catch (error) {
      throw error;
    }
  },

  get: (url: string, params?: any) => {
    const query = params
      ? '?' + Object.entries(params)
          .filter(([_, v]) => v !== undefined && v !== null)
          .map(([k, v]) => `${k}=${v}`)
          .join('&')
      : '';
    return http.request({ url: `${url}${query}`, method: 'GET' });
  },

  post: (url: string, data?: any) => {
    return http.request({ url, method: 'POST', data });
  },

  put: (url: string, data?: any) => {
    return http.request({ url, method: 'PUT', data });
  },

  delete: (url: string) => {
    return http.request({ url, method: 'DELETE' });
  },
};
