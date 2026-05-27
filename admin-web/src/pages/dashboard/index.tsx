import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Progress } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { http } from '../../services/http';

interface DashboardData {
  todayGmv: number;
  todayOrders: number;
  todayActiveMembers: number;
  todayNewMembers: number;
  todayActivities: number;
  walletBalanceTotal: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await http.get('/api/admin/v1/reports/dashboard');
      setData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>经营总览</h2>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日交易额"
              value={data.todayGmv}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#3f8600' }}
              suffix={<ArrowUpOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日订单"
              value={data.todayOrders}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活跃会员"
              value={data.todayActiveMembers}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日活动"
              value={data.todayActivities}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="新增会员">
            <Statistic
              value={data.todayNewMembers}
              prefix={<TeamOutlined />}
              suffix="人"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="钱包余额总额">
            <Statistic
              value={data.walletBalanceTotal}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
