import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { http } from '../../services/http';
import './index.scss';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleWxLogin = async () => {
    setLoading(true);
    try {
      // 获取微信登录code
      const { code } = await Taro.login();

      // 调用后端登录接口
      const response = await http.post('/api/client/v1/auth/wx-login', {
        code,
        tenant_id: 1, // 默认租户
      });

      const { access_token, refresh_token } = response.data.data;

      // 存储token
      Taro.setStorageSync('token', access_token);
      Taro.setStorageSync('refresh_token', refresh_token);

      Taro.showToast({
        title: '登录成功',
        icon: 'success',
      });

      // 跳转首页
      Taro.switchTab({
        url: '/pages/home/index',
      });
    } catch (error) {
      Taro.showToast({
        title: '登录失败',
        icon: 'none',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="login-page">
      <View className="logo-section">
        <Text className="logo">🏸</Text>
        <Text className="app-name">羽毛球俱乐部</Text>
        <Text className="app-desc">发现身边的羽毛球活动</Text>
      </View>

      <View className="login-actions">
        <View
          className={`wx-login-btn ${loading ? 'loading' : ''}`}
          onClick={handleWxLogin}
        >
          <Text className="btn-text">
            {loading ? '登录中...' : '微信一键登录'}
          </Text>
        </View>

        <View className="other-login">
          <Text className="divider-text">其他登录方式</Text>
        </View>

        <View className="phone-login-btn">
          <Text className="btn-text">手机号登录</Text>
        </View>
      </View>

      <View className="footer">
        <Text className="footer-text">
          登录即代表同意《用户协议》和《隐私政策》
        </Text>
      </View>
    </View>
  );
}
