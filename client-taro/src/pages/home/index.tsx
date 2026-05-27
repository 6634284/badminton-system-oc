import { View, Text } from '@tarojs/components';
import { useQuery } from '@tanstack/react-query';
import { http } from '../../services/http';
import './index.scss';

export default function HomePage() {
  const { data: activitiesData, isLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: () => http.get('/api/client/v1/activities', {
      params: { page: 1, limit: 10 },
    }),
  });

  const activities = activitiesData?.data?.data?.list || [];

  return (
    <View className="home-page">
      <View className="header">
        <Text className="title">羽毛球俱乐部</Text>
        <Text className="subtitle">发现身边的羽毛球活动</Text>
      </View>

      <View className="section">
        <Text className="section-title">近期活动</Text>
        {isLoading ? (
          <Text className="loading">加载中...</Text>
        ) : activities.length === 0 ? (
          <Text className="empty">暂无活动</Text>
        ) : (
          <View className="activity-list">
            {activities.map((item: any) => (
              <View key={item.id} className="activity-card card">
                <View className="card-header">
                  <Text className="activity-title">{item.title}</Text>
                  <Text className={`status status-${item.status}`}>
                    {item.status === 'registering' ? '报名中' :
                     item.status === 'full' ? '已满' :
                     item.status === 'finished' ? '已结束' : item.status}
                  </Text>
                </View>
                <View className="card-body">
                  <Text className="info">📅 {item.playDate?.slice(0, 10)}</Text>
                  <Text className="info">📍 {item.venue?.name}</Text>
                  <Text className="info">👥 {item.joinCount}/{item.capacity}人</Text>
                </View>
                <View className="card-footer">
                  <Text className="price">¥{item.price}/人</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
