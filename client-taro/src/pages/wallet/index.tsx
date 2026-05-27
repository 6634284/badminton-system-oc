import { View, Text } from '@tarojs/components';
import { useQuery } from '@tanstack/react-query';
import { http } from '../../services/http';
import './index.scss';

export default function WalletPage() {
  const { data: walletData, isLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => http.get('/api/client/v1/wallet'),
  });

  const { data: transactionsData } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => http.get('/api/client/v1/wallet/transactions', {
      params: { page: 1, limit: 10 },
    }),
  });

  const wallet = walletData?.data?.data;
  const transactions = transactionsData?.data?.data?.list || [];

  return (
    <View className="wallet-page">
      <View className="balance-card card">
        <Text className="balance-label">账户余额</Text>
        {isLoading ? (
          <Text className="balance-value">加载中...</Text>
        ) : (
          <Text className="balance-value">
            ¥{((wallet?.cash_balance || 0) + (wallet?.gift_balance || 0)).toFixed(2)}
          </Text>
        )}
        <View className="balance-detail">
          <View className="balance-item">
            <Text className="item-label">现金余额</Text>
            <Text className="item-value">¥{(wallet?.cash_balance || 0).toFixed(2)}</Text>
          </View>
          <View className="balance-item">
            <Text className="item-label">赠送余额</Text>
            <Text className="item-value">¥{(wallet?.gift_balance || 0).toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View className="actions card">
        <View className="action-btn">
          <Text className="btn-text">充值</Text>
        </View>
      </View>

      <View className="section">
        <Text className="section-title">交易记录</Text>
        <View className="transaction-list">
          {transactions.length === 0 ? (
            <Text className="empty">暂无交易记录</Text>
          ) : (
            transactions.map((item: any) => (
              <View key={item.id} className="transaction-item">
                <View className="transaction-info">
                  <Text className="transaction-type">
                    {item.direction === 'C' ? '收入' : '支出'}
                  </Text>
                  <Text className="transaction-remark">{item.remark || item.biz_type}</Text>
                </View>
                <Text className={`transaction-amount ${item.direction === 'C' ? 'income' : 'expense'}`}>
                  {item.direction === 'C' ? '+' : '-'}¥{Number(item.amount).toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
}
