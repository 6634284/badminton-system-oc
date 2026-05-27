import { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Select, Tag, Space, Modal, Form, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { http } from '../../services/http';

const { Option } = Select;

interface Activity {
  id: number;
  title: string;
  type: string;
  status: string;
  play_date: string;
  venue: { name: string };
  capacity: number;
  join_count: number;
  price: number;
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string | undefined>();

  useEffect(() => {
    fetchActivities();
  }, [page, keyword, status]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const response = await http.get('/api/admin/v1/activities', {
        params: { page, limit: 20, keyword, status },
      });
      setActivities(response.data.data.list);
      setTotal(response.data.data.total);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (id: number) => {
    try {
      await http.post(`/api/admin/v1/activities/${id}/publish`);
      message.success('发布成功');
      fetchActivities();
    } catch (error) {
      message.error('发布失败');
    }
  };

  const handleCancel = async (id: number) => {
    Modal.confirm({
      title: '确认取消',
      content: '确定要取消这个活动吗？将自动退款给已报名的会员。',
      onOk: async () => {
        try {
          await http.post(`/api/admin/v1/activities/${id}/cancel`, {
            reason: '管理员取消',
          });
          message.success('取消成功');
          fetchActivities();
        } catch (error) {
          message.error('取消失败');
        }
      },
    });
  };

  const columns = [
    {
      title: '活动名称',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap: Record<string, { label: string; color: string }> = {
          open_session: { label: '散场', color: 'blue' },
          private_court: { label: '包场', color: 'green' },
          coach_lesson: { label: '教练课', color: 'orange' },
          tournament: { label: '比赛', color: 'red' },
        };
        const item = typeMap[type] || { label: type, color: 'default' };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { label: string; color: string }> = {
          draft: { label: '草稿', color: 'default' },
          published: { label: '已发布', color: 'blue' },
          registering: { label: '报名中', color: 'green' },
          full: { label: '已满', color: 'orange' },
          ongoing: { label: '进行中', color: 'processing' },
          finished: { label: '已结束', color: 'default' },
          canceled: { label: '已取消', color: 'red' },
        };
        const item = statusMap[status] || { label: status, color: 'default' };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: '日期',
      dataIndex: 'play_date',
      key: 'play_date',
    },
    {
      title: '球馆',
      key: 'venue',
      render: (_: any, record: Activity) => record.venue?.name,
    },
    {
      title: '报名',
      key: 'registration',
      render: (_: any, record: Activity) => (
        <span>
          {record.join_count}/{record.capacity}
        </span>
      ),
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `¥${price}`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Activity) => (
        <Space>
          {record.status === 'draft' && (
            <Button type="primary" size="small" onClick={() => handlePublish(record.id)}>
              发布
            </Button>
          )}
          {['published', 'registering', 'full'].includes(record.status) && (
            <Button danger size="small" onClick={() => handleCancel(record.id)}>
              取消
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="活动管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />}>
            创建活动
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索活动"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 200 }}
          />
          <Select
            placeholder="状态筛选"
            allowClear
            value={status}
            onChange={setStatus}
            style={{ width: 120 }}
          >
            <Option value="draft">草稿</Option>
            <Option value="published">已发布</Option>
            <Option value="registering">报名中</Option>
            <Option value="full">已满</Option>
            <Option value="ongoing">进行中</Option>
            <Option value="finished">已结束</Option>
            <Option value="canceled">已取消</Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={activities}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: setPage,
          }}
        />
      </Card>
    </div>
  );
}
