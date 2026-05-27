import { View, Text, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '../../../services/http';
import './index.scss';

export default function ActivityDetailPage() {
  const router = useRouter();
  const activityId = router.params.id;
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['activity', activityId],
    queryFn: () => http.get(`/api/client/v1/activities/${activityId}`),
    enabled: !!activityId,
  });

  const activity = data?.data?.data;

  const registerMutation = useMutation({
    mutationFn: () =>
      http.post(`/api/client/v1/activities/${activityId}/registrations`, {
        extra_count: 0,
        pay_method: 'wallet',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity', activityId] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      Taro.showToast({
        title: '报名成功',
        icon: 'success',
      });
    },
    onError: (error: any) => {
      Taro.showToast({
        title: error.message || '报名失败',
        icon: 'none',
      });
    },
  });

  const handleRegister = async () => {
    const token = Taro.getStorageSync('token');
    if (!token) {
      Taro.navigateTo({ url: '/pages/login/index' });
      return;
    }

    if (activity?.status !== 'registering') {
      Taro.showToast({
        title: '活动当前不允许报名',
        icon: 'none',
      });
      return;
    }

    setLoading(true);
    try {
      await registerMutation.mutateAsync();
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View className="activity-detail-page">
        <Text className="loading">加载中...</Text>
      </View>
    );
  }

  if (!activity) {
    return (
      <View className="activity-detail-page">
        <Text className="error">活动不存在</Text>
      </View>
    );
  }

  return (
    <View className="activity-detail-page">
      <View className="header card">
        <Text className="title">{activity.title}</Text>
        <Text className={`status status-${activity.status}`}>
          {activity.status === 'registering' ? '报名中' :
           activity.status === 'full' ? '已满' :
           activity.status === 'finished' ? '已结束' : activity.status}
        </Text>
      </View>

      <View className="info-section card">
        <Text className="section-title">活动信息</Text>
        <View className="info-row">
          <Text className="label">📅 日期</Text>
          <Text className="value">{activity.play_date}</Text>
        </View>
        <View className="info-row">
          <Text className="label">⏰ 时间</Text>
          <Text className="value">{activity.start_at} - {activity.end_at}</Text>
        </View>
        <View className="info-row">
          <Text className="label">📍 地点</Text>
          <Text className="value">{activity.venue?.name}</Text>
        </View>
        <View className="info-row">
          <Text className="label">👥 人数</Text>
          <Text className="value">{activity.join_count}/{activity.capacity}人</Text>
        </View>
        <View className="info-row">
          <Text className="label">💰 价格</Text>
          <Text className="value price">¥{activity.price}/人</Text>
        </View>
      </View>

      <View className="action-bar">
        <View className="price-info">
          <Text className="price-label">单价</Text>
          <Text className="price-value">¥{activity.price}</Text>
        </View>
        <View
          className={`register-btn ${activity.status !== 'registering' ? 'disabled' : ''} ${loading ? 'loading' : ''}`}
          onClick={handleRegister}
        >
          <Text className="btn-text">
            {loading ? '报名中...' :
             activity.status === 'registering' ? '立即报名' :
             activity.status === 'full' ? '已满员' :
             activity.status === 'finished' ? '已结束' : '暂未开始'}
          </Text>
        </View>
      </View>
    </View>
  );
}
