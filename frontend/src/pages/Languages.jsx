import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Card, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import client from '../api/client';

const { Title } = Typography;

const Languages = () => {
    const [languages, setLanguages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingLang, setEditingLang] = useState(null);
    const [form] = Form.useForm();

    const fetchLanguages = async () => {
        setLoading(true);
        try {
            const res = await client.get('/api/v1/cms/languages');
            setLanguages(res.data);
        } catch (error) {
            message.error('Ошибка загрузки языков');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLanguages();
    }, []);

    const handleAdd = () => {
        setEditingLang(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingLang(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleDelete = async (code) => {
        try {
            await client.delete(`/api/v1/cms/languages/${code}`);
            message.success('Язык удален');
            fetchLanguages();
        } catch (error) {
            message.error('Ошибка удаления');
        }
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            if (editingLang) {
                await client.put(`/api/v1/cms/languages/${editingLang.code}`, values);
                message.success('Язык обновлен');
            } else {
                await client.post('/api/v1/cms/languages', values);
                message.success('Язык создан');
            }
            setIsModalVisible(false);
            fetchLanguages();
        } catch (error) {
            message.error('Ошибка сохранения');
        }
    };

    const columns = [
        {
            title: 'Код',
            dataIndex: 'code',
            key: 'code',
            width: 150,
        },
        {
            title: 'Название',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Действия',
            key: 'action',
            width: 150,
            render: (_, record) => (
                <Space size="middle">
                    <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
                    <Button danger icon={<DeleteOutlined />} size="small" onClick={() => handleDelete(record.code)} />
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4}>Языки жестов</Title>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchLanguages} loading={loading} />
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        Добавить язык
                    </Button>
                </Space>
            </div>

            <Card bodyStyle={{ padding: 0 }}>
                <Table
                    columns={columns}
                    dataSource={languages}
                    rowKey="code"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <Modal
                title={editingLang ? "Редактировать язык" : "Добавить язык"}
                open={isModalVisible}
                onOk={handleOk}
                onCancel={() => setIsModalVisible(false)}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="code"
                        label="Код (ISO)"
                        rules={[{ required: true, message: 'Введите код языка' }]}
                    >
                        <Input placeholder="ru-RSL" disabled={!!editingLang} />
                    </Form.Item>
                    <Form.Item
                        name="name"
                        label="Название"
                        rules={[{ required: true, message: 'Введите название' }]}
                    >
                        <Input placeholder="Russian Sign Language" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Languages;
