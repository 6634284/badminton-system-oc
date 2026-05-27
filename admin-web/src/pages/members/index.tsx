import { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Select, Tag, Space, Modal, Form, message, Drawer, Descriptions } from 'antd';
import { PlusOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { http } from '../../services/http';

const { Option } = Select;

interface Member {
  id: number;
  member_no: string;
  level: number;
  points: number;
  total_spent_amount: number;
  blacklisted: boolean;
  joined_at: string;
  user: {
    nickname: string;
    phone: string;
    avatar_url: string;
  };
  tags: string[];
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [level, setLevel] = useState<number | undefined>();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [page, keyword, level]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const response = await http.get('/api/admin/v1/members', {
        params: { page, limit: 20, keyword, level },
      });
      setMembers(response.data.data.list);
      setTotal(response.data.data.total);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlacklist = async (id: number) => {
    Modal.confirm({
      title: '确认拉黑',
      content: '确定要拉黑这个会员吗？拉黑后将无法报名活动。',
      onOk: async () => {
        try {
          await http.post(`/api/admin/v1/members/${id}/blacklist`);
          message.success('拉黑成功');
          fetchMembers();
        } catch (error) {
          message.error('拉黑失败');
        }
      },
    });
  };

  const showDrawer = (member: Member) => {
    setSelectedMember(member);
    setDrawerVisible(true);
  };

  const columns = [
    {
      title: '会员号',
      dataIndex: 'member_no',
      key: 'member_no',
    },
    {
      title: '昵称',
      key: 'nickname',
      render: (_: any, record: Member) => record.user?.nickname,
    },
    {
      title: '手机号',
      key: 'phone',
      render: (_: any, record: Member) => record.user?.phone,
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      render: (level: number) => <Tag color="blue">V{level}</Tag>,
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
    },
    {
      title: '消费金额',
      dataIndex: 'total_spent_amount',
      key: 'total_spent_amount',
      render: (amount: number) => `¥${Number(amount).toFixed(2)}`,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <>
          {tags?.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: (_: any, record: Member) => (
        <Tag color={record.blacklisted ? 'red' : 'green'}>
          {record.blacklisted ? '已拉黑' : '正常'}
        </Tag>
      ),
    },
    {
      title: '加入时间',
      dataIndex: 'joined_at',
      key: 'joined_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Member) => (
        <Space>
          <Button size="small" onClick={() => showDrawer(record)}>
            详情
          </Button>
          {!record.blacklisted && (
            <Button danger size="small" onClick={() => handleBlacklist(record.id)}>
              拉黑
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="会员管理">
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索会员"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 200 }}
          />
          <Select
            placeholder="等级筛选"
            allowClear
            value={level}
            onChange={setLevel}
            style={{ width: 120 }}
          >
            <Option value={1}>V1</Option>
            <Option value={2}>V2</Option>
            <Option value={3}>V3</Option>
            <Option value={4}>V4</Option>
            <Option value={5}>V5</Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={members}
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

      <Drawer
        title="会员详情"
        placement="right"
        width={500}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {selectedMember && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="会员号">
              {selectedMember.member_no}
            </Descriptions.Item>
            <Descriptions.Item label="昵称">
              {selectedMember.user?.nickname}
            </Descriptions.Item>
            <Descriptions.Item label="手机号">
              {selectedMember.user?.phone}
            </Descriptions.Item>
            <Descriptions.Item label="等级">
              <Tag color="blue">V{selectedMember.level}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="积分">
              {selectedMember.points}
            </Descriptions.Item>
            <Descriptions.Item label="消费金额">
              ¥{Number(selectedMember.total_spent_amount).toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="标签">
              {selectedMember.tags?.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={selectedMember.blacklisted ? 'red' : 'green'}>
                {selectedMember.blacklisted ? '已拉黑' : '正常'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="加入时间">
              {new Date(selectedMember.joined_at).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
