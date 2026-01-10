import React, { useState, useEffect } from 'react';
import { Table, Button, Upload, message, Tooltip, Space, Typography, Card } from 'antd';
import {
    UploadOutlined,
    DeleteOutlined,
    DownloadOutlined,
    FileOutlined,
    FileImageOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import client from '../api/client';

const { Title } = Typography;

const Files = () => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            // Switch to fetching Assets from DB to show metadata
            const res = await client.get('/api/v1/cms/assets?limit=100');
            setFiles(res.data);
        } catch (error) {
            message.error('Ошибка загрузки файлов');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, []);

    const handleDelete = async (id) => {
        try {
            await client.delete(`/api/v1/cms/assets/${id}`);
            message.success('Файл удален');
            fetchFiles();
        } catch (error) {
            console.error(error);
            message.error('Ошибка удаления');
        }
    };

    const handleDownload = (url) => {
        window.open(url, '_blank');
    };

    const uploadProps = {
        name: 'file',
        showUploadList: false, // Non-blocking!
        customRequest: async ({ file, onSuccess, onError }) => {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);

            // Show loading message
            const hide = message.loading(`Загрузка ${file.name}...`, 0);

            try {
                await client.post('/api/v1/files/upload', formData); // Still uses file upload endpoint
                hide();
                message.success(`${file.name} загружен`);
                onSuccess("ok");
                fetchFiles();
            } catch (error) {
                hide();
                message.error(`${file.name} ошибка загрузки`);
                onError(error);
            } finally {
                setUploading(false);
            }
        },
    };

    const columns = [
        {
            title: 'Preview',
            dataIndex: 'file_url',
            key: 'preview',
            width: 80,
            render: (url) => {
                const ext = url.split('.').pop().toLowerCase();
                if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                    return <img src={url} alt="preview" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />;
                }
                if (['mp4', 'webm', 'mov'].includes(ext)) {
                    return <FileImageOutlined style={{ fontSize: 24, color: '#1890ff' }} />;
                }
                return <FileOutlined style={{ fontSize: 24 }} />;
            }
        },
        {
            title: 'Имя файла',
            dataIndex: 'file_url',
            key: 'name',
            render: (url) => <Typography.Text copyable>{url.split('/').pop()}</Typography.Text>,
        },
        {
            title: 'Metadata',
            key: 'metadata',
            render: (_, record) => (
                <Space direction="vertical" size={0} style={{ fontSize: 12 }}>
                    {record.duration && <Typography.Text type="secondary">Duration: {record.duration.toFixed(2)}s</Typography.Text>}
                    {record.framerate && <Typography.Text type="secondary">FPS: {record.framerate}</Typography.Text>}
                    {record.frame_count && <Typography.Text type="secondary">Frames: {record.frame_count}</Typography.Text>}
                </Space>
            )
        },
        {
            title: 'Дата',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (text) => new Date(text).toLocaleString()
        },
        {
            title: 'Действия',
            key: 'action',
            width: 150,
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="Скачать/Открыть">
                        <Button
                            icon={<DownloadOutlined />}
                            size="small"
                            onClick={() => handleDownload(record.file_url)}
                        />
                    </Tooltip>
                    <Tooltip title="Удалить">
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                            onClick={() => handleDelete(record.id)}
                        />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4}>Файловое хранилище (Assets)</Title>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchFiles} loading={loading} />
                    <Upload {...uploadProps}>
                        <Button type="primary" icon={<UploadOutlined />} loading={uploading}>
                            Загрузить файл
                        </Button>
                    </Upload>
                </Space>
            </div>

            <Card bodyStyle={{ padding: 0 }}>
                <Table
                    columns={columns}
                    dataSource={files}
                    rowKey="id" // Asset ID
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>
        </div>
    );
};

export default Files;
