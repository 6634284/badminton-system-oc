import { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Tag, Space, Modal, Form, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { http } from '../../services/http';

interface Venue {
  id: number;
  name: string;
  city: string;
  district: string;
  address: string;
  status: string;
  courts: any[];
}

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchVenues();
  }, [page, keyword]);

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const response = await http.get('/api/admin/v1/venues', {
        params: { page, limit: 20, keyword },
      });
      setVenues(response.data.data.list);
      setTotal(response.data.data.total);
    } catch (error) {
      console.error('Failed to fetch venues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: any) => {
    try {
      await http.post('/api/admin/v1/venues', values);
      message.success('创建成功');
      setModalVisible(false);
      form.resetFields();
      fetchVenues();
    } catch (error) {
      message.error('创建失败');
    }
  };

  const columns = [
    {
      title: '球馆名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: '区域',
      dataIndex: 'district',
      key: 'district',
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: '场地数',
      key: 'courts',
      render: (_: any, record: Venue) => record.courts?.length || 0,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '营业中' : '已停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Venue) => (
        <Space>
          <Button size="small">编辑</Button>
          <Button size="small">场地管理</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="球馆管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
            添加球馆
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索球馆"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 200 }}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={venues}
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

      <Modal
        title="添加球馆"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item name="name" label="球馆名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="city" label="城市">
            <Input />
          </Form.Item>
          <Form.Item name="district" label="区域">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">创建</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
