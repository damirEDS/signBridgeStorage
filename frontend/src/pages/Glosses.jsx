import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Card, Typography, Tag, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import client from '../api/client';

const { Title } = Typography;

const Glosses = () => {
    const [glosses, setGlosses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingGloss, setEditingGloss] = useState(null);
    const [form] = Form.useForm();

    const [searchText, setSearchText] = useState('');

    const fetchGlosses = async (query = '') => {
        setLoading(true);
        try {
            const res = await client.get('/api/v1/cms/glosses', {
                params: { search: query }
            });
            setGlosses(res.data);
        } catch (error) {
            message.error('Ошибка загрузки глоссов');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGlosses();
    }, []);

    const handleSearch = (value) => {
        setSearchText(value);
        fetchGlosses(value);
    };

    const handleAdd = () => {
        setEditingGloss(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingGloss(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await client.delete(`/api/v1/cms/glosses/${id}`);
            message.success('Глосс удален');
            fetchGlosses(searchText);
        } catch (error) {
            message.error('Ошибка удаления');
        }
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            if (editingGloss) {
                await client.put(`/api/v1/cms/glosses/${editingGloss.id}`, values);
                message.success('Глосс обновлен');
            } else {
                await client.post('/api/v1/cms/glosses', values);
                message.success('Глосс создан');
            }
            setIsModalVisible(false);
            fetchGlosses(searchText);
        } catch (error) {
            message.error('Ошибка сохранения');
        }
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
        },
        {
            title: 'Название (Глосс)',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <b style={{ color: '#1890ff' }}>{text}</b>
        },
        {
            title: 'Синонимы',
            dataIndex: 'synonyms',
            key: 'synonyms',
            render: (synonyms) => (
                <>
                    {synonyms && synonyms.map(tag => (
                        <Tag key={tag}>{tag}</Tag>
                    ))}
                </>
            ),
        },
        {
            title: 'Описание',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: 'Действия',
            key: 'action',
            width: 150,
            render: (_, record) => (
                <Space size="middle">
                    <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
                    <Button danger icon={<DeleteOutlined />} size="small" onClick={() => handleDelete(record.id)} />
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4}>Словарь жестов (Глоссы)</Title>
                <Space>
                    <Input.Search
                        placeholder="Поиск глосса..."
                        onSearch={handleSearch}
                        allowClear
                        enterButton
                        style={{ width: 300 }}
                    />
                    <Button icon={<ReloadOutlined />} onClick={() => fetchGlosses(searchText)} loading={loading} />
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        Добавить глосс
                    </Button>
                </Space>
            </div>

            <Card bodyStyle={{ padding: 0 }}>
                <Table
                    columns={columns}
                    dataSource={glosses}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 15 }}
                />
            </Card>

            <Modal
                title={editingGloss ? "Редактировать глосс" : "Добавить глосс"}
                open={isModalVisible}
                onOk={handleOk}
                onCancel={() => setIsModalVisible(false)}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="name"
                        label="Название (Глосс)"
                        rules={[{ required: true, message: 'Введите название' }]}
                    >
                        <Input placeholder="HELLO" />
                    </Form.Item>
                    <Form.Item
                        name="synonyms"
                        label="Синонимы"
                    >
                        <Select mode="tags" placeholder="Введите синонимы и нажмите Enter" tokenSeparators={[',']} />
                    </Form.Item>
                    <Form.Item
                        name="description"
                        label="Описание"
                    >
                        <Input.TextArea rows={4} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Glosses;
