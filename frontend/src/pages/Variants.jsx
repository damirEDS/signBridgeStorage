import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Select, InputNumber, message, Space, Card, Typography, Tag, Divider, Checkbox } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, LinkOutlined } from '@ant-design/icons';
import client from '../api/client';

const { Title } = Typography;
const { Option } = Select;

const Variants = () => {
    const [variants, setVariants] = useState([]);
    const [glosses, setGlosses] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [assets, setAssets] = useState([]);

    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingVariant, setEditingVariant] = useState(null);
    const [form] = Form.useForm();

    const [filterGloss, setFilterGloss] = useState(null);
    const [filterLang, setFilterLang] = useState(null);

    // Delete Modal State
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteWithFile, setDeleteWithFile] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterGloss) params.gloss_id = filterGloss;
            if (filterLang) params.language_id = filterLang;

            const [varRes, glossRes, langRes, assetRes] = await Promise.all([
                client.get('/api/v1/cms/variants', { params }), // Apply filters
                client.get('/api/v1/cms/glosses'),
                client.get('/api/v1/cms/languages'),
                client.get('/api/v1/cms/assets'),
            ]);

            setVariants(varRes.data);
            setGlosses(glossRes.data);
            setLanguages(langRes.data);
            setAssets(assetRes.data);
        } catch (error) {
            message.error('Ошибка загрузки данных');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filterGloss, filterLang]); // Re-fetch when filters change


    // ... (handleAdd, handleEdit, handleDelete, handleOk)
    const handleAdd = () => {
        setEditingVariant(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingVariant(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleDelete = (id) => {
        let deleteFile = false; // Internal state for the modal closure, though Modal.confirm content is tricky to manage state.
        // Ant Design Modal.confirm content is static usually.
        // To support checkbox interaction, we should use our own state and modal or a custom content component.
        // Or simpler: Use two buttons or just a custom modal.

        // Let's use a simple confirm with a custom content that updates a ref or something? 
        // No, React state doesn't update inside the static Modal.confirm easily.

        // Better Approach: Use a separate state for 'deleteModalVisible' and 'deleteTargetId'.
        setDeleteTarget(id);
        setDeleteWithFile(false);
        setIsDeleteModalVisible(true);
    };

    const confirmDelete = async () => {
        try {
            await client.delete(`/api/v1/cms/variants/${deleteTarget}?delete_file=${deleteWithFile}`);
            message.success('Вариант удален');
            setIsDeleteModalVisible(false);
            fetchData();
        } catch (error) {
            message.error('Ошибка удаления');
        }
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            if (editingVariant) {
                await client.put(`/api/v1/cms/variants/${editingVariant.id}`, values);
                message.success('Вариант обновлен');
            } else {
                await client.post('/api/v1/cms/variants', values);
                message.success('Вариант создан');
            }
            setIsModalVisible(false);
            fetchData();
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
            title: 'Глосс',
            dataIndex: ['gloss', 'name'],
            key: 'gloss',
            render: (text) => <b>{text}</b>
        },
        {
            title: 'Язык',
            dataIndex: ['language', 'code'],
            key: 'language',
            render: (text) => <Tag color="blue">{text}</Tag>
        },
        {
            title: 'Анимация (файл)',
            dataIndex: ['asset', 'file_url'],
            key: 'asset',
            render: (url) => url ? (
                <a href={url} target="_blank" rel="noopener noreferrer">
                    <LinkOutlined /> {url.split('/').pop()}
                </a>
            ) : <span style={{ color: 'red' }}>Нет файла</span>
        },
        {
            title: 'Тип',
            dataIndex: 'type',
            key: 'type',
        },
        {
            title: 'Эмоция',
            dataIndex: 'emotion',
            key: 'emotion',
        },
        {
            title: 'Приоритет',
            dataIndex: 'priority',
            key: 'priority',
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
                <Title level={4}>Варианты исполнений (Связи)</Title>
                <Space>
                    <Select
                        placeholder="Фильтр по глоссу"
                        allowClear
                        style={{ width: 200 }}
                        onChange={setFilterGloss}
                        showSearch
                        optionFilterProp="children"
                    >
                        {glosses.map(g => <Option key={g.id} value={g.id}>{g.name}</Option>)}
                    </Select>
                    <Select
                        placeholder="Фильтр по языку"
                        allowClear
                        style={{ width: 150 }}
                        onChange={setFilterLang}
                    >
                        {languages.map(l => <Option key={l.code} value={l.code}>{l.name}</Option>)}
                    </Select>

                    <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading} />
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        Добавить вариант
                    </Button>
                </Space>
            </div>

            <Card bodyStyle={{ padding: 0 }}>
                <Table
                    columns={columns}
                    dataSource={variants}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 15 }}
                />
            </Card>

            <Modal
                title={editingVariant ? "Редактировать вариант" : "Создать новый вариант жеста"}
                open={isModalVisible}
                onOk={handleOk}
                onCancel={() => setIsModalVisible(false)}
                width={700}
            >
                <Form form={form} layout="vertical" initialValues={{ priority: 50, type: "lexical", emotion: "Neutral" }}>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Form.Item
                            name="gloss_id"
                            label="Глосс (Понятие)"
                            rules={[{ required: true, message: 'Выберите глосс' }]}
                        >
                            <Select showSearch optionFilterProp="children">
                                {glosses.map(g => (
                                    <Option key={g.id} value={g.id}>{g.name}</Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="language_id"
                            label="Язык"
                            rules={[{ required: true, message: 'Выберите язык' }]}
                        >
                            <Select showSearch optionFilterProp="children">
                                {languages.map(l => (
                                    <Option key={l.code} value={l.code}>{l.name} ({l.code})</Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </div>

                    <Divider orientation="left">Анимация и параметры</Divider>

                    <Form.Item
                        name="asset_id"
                        label="Файл анимации (Asset)"
                        rules={[{ required: true, message: 'Выберите файл анимации' }]}
                        help="Загрузите файл в разделе 'Файлы', чтобы он появился здесь."
                    >
                        <Select showSearch optionFilterProp="children" placeholder="Выберите файл...">
                            {assets.map(a => (
                                <Option key={a.id} value={a.id}>
                                    {a.file_url ? a.file_url.split('/').pop() : 'Unknown File'} (Hash: {a.file_hash?.substring(0, 6)})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        <Form.Item name="type" label="Тип">
                            <Select>
                                <Option value="lexical">Lexical</Option>
                                <Option value="fingerspelling">Fingerspelling</Option>
                                <Option value="classifier">Classifier</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="emotion" label="Эмоция">
                            <Select>
                                <Option value="Neutral">Neutral</Option>
                                <Option value="Happy">Happy</Option>
                                <Option value="Sad">Sad</Option>
                                <Option value="Angry">Angry</Option>
                                <Option value="Question">Question</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="priority" label="Приоритет (0-100)">
                            <InputNumber min={0} max={100} style={{ width: '100%' }} />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>

            <Modal
                title="Удаление варианта"
                open={isDeleteModalVisible}
                onOk={confirmDelete}
                onCancel={() => setIsDeleteModalVisible(false)}
                okText="Удалить"
                okButtonProps={{ danger: true }}
                cancelText="Отмена"
            >
                <p>Вы уверены, что хотите удалить этот вариант (связь)?</p>
                <div style={{ marginTop: 16, padding: 12, background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 4 }}>
                    <Checkbox checked={deleteWithFile} onChange={e => setDeleteWithFile(e.target.checked)}>
                        Также удалить исходный файл (Asset) из хранилища?
                    </Checkbox>
                    <div style={{ marginTop: 4, fontSize: 12, color: '#cf1322' }}>
                        Внимание: Если этот файл используется в других вариантах, он не будет удален.
                    </div>
                </div>
            </Modal>
        </div >
    );
};

export default Variants;
