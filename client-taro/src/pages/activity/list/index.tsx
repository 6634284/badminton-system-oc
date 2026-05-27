import { View, Text } from '@tarojs/components';
import { useQuery } from '@tanstack/react-query';
import { http } from '../../services/http';
import './index.scss';

export default function ActivityListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: () =>
      http.get('/api/client/v1/activities', {
        params: { page: 1, limit: 20 },
      }),
  });

  return (
    <View className="activity-list-page">
      <View className="header">
        <Text className="title">活动列表</Text>
      </View>

      {isLoading ? (
        <Text className="loading">加载中...</Text>
      ) : (
        <View className="list">
          {data?.data?.data?.list?.map((item: any) => (
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
                <Text className="info">📅 {item.play_date}</Text>
                <Text className="info">📍 {item.venue?.name}</Text>
                <Text className="info">👥 {item.join_count}/{item.capacity}人</Text>
              </View>
              <View className="card-footer">
                <Text className="price">¥{item.price}/人</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
