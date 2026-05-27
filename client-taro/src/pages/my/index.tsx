import { View, Text } from '@tarojs/components';
import { useQuery } from '@tanstack/react-query';
import { http } from '../../services/http';
import './index.scss';

export default function MyPage() {
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: () => http.get('/api/client/v1/users/me'),
  });

  const user = userData?.data?.data;

  return (
    <View className="my-page">
      <View className="user-card card">
        <View className="avatar">
          <Text className="avatar-text">
            {user?.member?.user?.nickname?.[0] || '🏸'}
          </Text>
        </View>
        <View className="user-info">
          <Text className="nickname">
            {user?.member?.user?.nickname || '未登录'}
          </Text>
          <Text className="member-no">
            {user?.member?.member_no ? `会员号: ${user.member.member_no}` : ''}
          </Text>
        </View>
      </View>

      <View className="menu-section card">
        <View className="menu-item">
          <Text className="menu-icon">📋</Text>
          <Text className="menu-text">我的报名</Text>
          <Text className="menu-arrow">›</Text>
        </View>
        <View className="menu-item">
          <Text className="menu-icon">🛒</Text>
          <Text className="menu-text">我的订单</Text>
          <Text className="menu-arrow">›</Text>
        </View>
        <View className="menu-item">
          <Text className="menu-icon">🎫</Text>
          <Text className="menu-text">优惠券</Text>
          <Text className="menu-arrow">›</Text>
        </View>
        <View className="menu-item">
          <Text className="menu-icon">💬</Text>
          <Text className="menu-text">消息通知</Text>
          <Text className="menu-arrow">›</Text>
        </View>
      </View>

      <View className="menu-section card">
        <View className="menu-item">
          <Text className="menu-icon">⚙️</Text>
          <Text className="menu-text">设置</Text>
          <Text className="menu-arrow">›</Text>
        </View>
        <View className="menu-item">
          <Text className="menu-icon">❓</Text>
          <Text className="menu-text">帮助与反馈</Text>
          <Text className="menu-arrow">›</Text>
        </View>
      </View>
    </View>
  );
}
