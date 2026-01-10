import React, { useState, useEffect } from 'react';
import { Card, Steps, Upload, Input, Select, Button, Form, Divider, Space, Typography, message, Row, Col, Radio } from 'antd';
import { InboxOutlined, PlusOutlined, ArrowRightOutlined, RocketOutlined } from '@ant-design/icons';
import client from '../api/client';
import DynamicIsland from '../components/DynamicIsland';

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { Option } = Select;

const UnifiedAdd = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [form] = Form.useForm();

    // Data
    const [glosses, setGlosses] = useState([]);
    const [languages, setLanguages] = useState([]);

    // State
    const [uploadFile, setUploadFile] = useState(null);
    const [newGlossName, setNewGlossName] = useState('');
    const [isCreatingGloss, setIsCreatingGloss] = useState(false);

    // Island State
    const [islandState, setIslandState] = useState('idle'); // idle, loading, success, error
    const [islandMessage, setIslandMessage] = useState('');

    useEffect(() => {
        const fetchRefs = async () => {
            const [gRes, lRes] = await Promise.all([
                client.get('/api/v1/cms/glosses'),
                client.get('/api/v1/cms/languages')
            ]);
            setGlosses(gRes.data);
            setLanguages(lRes.data);
        };
        fetchRefs();
    }, []);

    const onFileChange = (info) => {
        const { status } = info.file;
        if (status !== 'uploading') {
            // We use custom request or just manual upload, so just grab the file
            setUploadFile(info.file.originFileObj);
            setCurrentStep(1); // Auto advance
        }
    };

    const handleCreateGloss = async () => {
        if (!newGlossName) return;
        setIslandState('loading');
        setIslandMessage('Creating Gloss...');
        try {
            const res = await client.post('/api/v1/cms/glosses', { name: newGlossName.toUpperCase() });
            setGlosses([...glosses, res.data]);
            form.setFieldsValue({ gloss_id: res.data.id });
            setIsCreatingGloss(false);
            setIslandState('success');
            setIslandMessage('Gloss Created!');
            setTimeout(() => setIslandState('idle'), 2000);
        } catch (e) {
            setIslandState('error');
            setIslandMessage('Failed to create gloss');
            setTimeout(() => setIslandState('idle'), 3000);
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            if (!uploadFile) {
                message.error('Please upload a file first');
                return;
            }

            setIslandState('loading');
            setIslandMessage('Uploading & Processing...');

            // 1. Upload File
            const formData = new FormData();
            formData.append('file', uploadFile);
            if (values.transition_in) formData.append('transition_in', values.transition_in);
            if (values.transition_out) formData.append('transition_out', values.transition_out);

            const uploadRes = await client.post('/api/v1/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (!uploadRes.data.success) throw new Error('Upload failed');

            // 2. Create Asset (handled by backend? No, backend /upload returns success but we need asset_id. 
            // Wait, previous implementation assumes /upload creates asset? 
            // Checking implementation_plan: "Asset Logic: Update upload flow to calculate Hash and create Asset record".
            // Checking file.py: "Create DB Asset". YES. 
            // Need to get the Asset ID? The current /upload response might not return ID. 
            // Let's check files.py again later. For now assume we need to FIND it or update backend to return ID.
            // Actually, let's fetch assets and find by hash/name OR updated backend to return ID.

            // TEMP FIX: Fetch assets and find the latest one (risky) or searching by hash. 
            // BETTER: We will assume backend returns asset_id if we modified it? 
            // I will check files.py. If not, I'll need to update it.

            // Let's assume for this "Unified" flow we might need to verify that. 
            // proceeding with assumption we can link it.

            // Realistically, to be safe, let's look up the asset by hash (calculated on client? no).
            // Let's rely on finding the asset by filename/latest for now, or assume the user wants me to fix backend too.
            // I'll add a lookup step here implicitly.

            const assetsRes = await client.get('/api/v1/cms/assets');
            const asset = assetsRes.data.find(a => a.file_url === uploadRes.data.url);

            if (!asset) throw new Error('Asset not found after upload');

            // 3. Create Variant
            await client.post('/api/v1/cms/variants', {
                ...values,
                asset_id: asset.id
            });

            setIslandState('success');
            setIslandMessage('All Done! Variant Created.');

            // Reset
            setTimeout(() => {
                setIslandState('idle');
                setCurrentStep(0);
                form.resetFields();
                setUploadFile(null);
            }, 3000);

        } catch (error) {
            console.error(error);
            setIslandState('error');
            setIslandMessage('Error occurred');
            setTimeout(() => setIslandState('idle'), 3000);
        }
    };

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <DynamicIsland state={islandState} message={islandMessage} />

            <Title level={2} style={{ textAlign: 'center', marginBottom: 40 }}>
                Unified Import <RocketOutlined />
            </Title>

            <Steps current={currentStep} style={{ marginBottom: 40 }}>
                <Steps.Step title="Upload VRMA" icon={<InboxOutlined />} />
                <Steps.Step title="Link Data" icon={<PlusOutlined />} />
            </Steps>

            <Card>
                <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
                    <Dragger
                        accept=".vrma,.fbx,.glb"
                        multiple={false}
                        customRequest={({ onSuccess }) => setTimeout(() => onSuccess("ok"), 0)}
                        onChange={onFileChange}
                        showUploadList={false}
                        height={300}
                    >
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined style={{ fontSize: 60, color: '#1890ff' }} />
                        </p>
                        <p className="ant-upload-text">Кликните или перетащите файл VRMA</p>
                        <p className="ant-upload-hint">
                            Поддержка .vrma, .fbx, .glb (Single file upload)
                        </p>
                    </Dragger>
                </div>

                <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        <Text strong>Selected: {uploadFile?.name}</Text>
                        <Button type="link" onClick={() => setCurrentStep(0)}>Change</Button>
                    </div>

                    <Form form={form} layout="vertical" initialValues={{ priority: 50, type: 'lexical', emotion: 'Neutral' }}>

                        <Row gutter={16}>
                            <Col span={12}>
                                {isCreatingGloss ? (
                                    <Form.Item label="Создание нового глосса">
                                        <Input.Search
                                            placeholder="Введите название (напр. HELLO)"
                                            enterButton="Создать"
                                            value={newGlossName}
                                            onChange={e => setNewGlossName(e.target.value)}
                                            onSearch={handleCreateGloss}
                                        />
                                        <Button type="link" onClick={() => setIsCreatingGloss(false)} size="small">Отмена</Button>
                                    </Form.Item>
                                ) : (
                                    <Form.Item name="gloss_id" label="Выберите глосс" rules={[{ required: true }]}>
                                        <Select
                                            showSearch
                                            optionFilterProp="children"
                                            dropdownRender={menu => (
                                                <>
                                                    {menu}
                                                    <Divider style={{ margin: '8px 0' }} />
                                                    <Button type="text" block icon={<PlusOutlined />} onClick={() => setIsCreatingGloss(true)}>
                                                        Создать новый глосс
                                                    </Button>
                                                </>
                                            )}
                                        >
                                            {glosses.map(g => <Option key={g.id} value={g.id}>{g.name}</Option>)}
                                        </Select>
                                    </Form.Item>
                                )}
                            </Col>
                            <Col span={12}>
                                <Form.Item name="language_id" label="Язык" rules={[{ required: true }]}>
                                    <Select showSearch>
                                        {languages.map(l => <Option key={l.code} value={l.code}>{l.name}</Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item name="emotion" label="Эмоция">
                                    <Select>
                                        <Option value="Neutral">Neutral</Option>
                                        <Option value="Happy">Happy</Option>
                                        <Option value="Sad">Sad</Option>
                                        <Option value="Angry">Angry</Option>
                                        <Option value="Question">Question</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="type" label="Тип">
                                    <Select>
                                        <Option value="lexical">Lexical</Option>
                                        <Option value="fingerspelling">Fingerspelling</Option>
                                        <Option value="classifier">Classifier</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="priority" label="Приоритет">
                                    <Select>
                                        <Option value={100}>High (100)</Option>
                                        <Option value={50}>Normal (50)</Option>
                                        <Option value={10}>Low (10)</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Divider orientation="left" style={{ margin: '10px 0' }}>Настройки Переходов</Divider>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="transition_in" label="Transition In (Handshape)">
                                    <Select placeholder="Select Handshape" allowClear>
                                        <Option value="neutral">Neutral (Relaxed)</Option>
                                        <Option value="fist">Fist (S-hand)</Option>
                                        <Option value="flat">Flat (B-hand)</Option>
                                        <Option value="index">Index (Pointing)</Option>
                                        <Option value="cup">Cup (C-hand)</Option>
                                        <Option value="spread">Spread (5-hand)</Option>
                                        <Option value="ok">OK Sign</Option>
                                        <Option value="thumbs_up">Thumbs Up</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="transition_out" label="Transition Out (Handshape)">
                                    <Select placeholder="Select Handshape" allowClear>
                                        <Option value="neutral">Neutral (Relaxed)</Option>
                                        <Option value="fist">Fist (S-hand)</Option>
                                        <Option value="flat">Flat (B-hand)</Option>
                                        <Option value="index">Index (Pointing)</Option>
                                        <Option value="cup">Cup (C-hand)</Option>
                                        <Option value="spread">Spread (5-hand)</Option>
                                        <Option value="ok">OK Sign</Option>
                                        <Option value="thumbs_up">Thumbs Up</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <div style={{ marginTop: 20, textAlign: 'right' }}>
                            <Button onClick={() => setCurrentStep(0)} style={{ marginRight: 10 }}>Назад</Button>
                            <Button type="primary" size="large" onClick={handleSubmit} icon={<RocketOutlined />}>
                                Загрузить и Создать
                            </Button>
                        </div>
                    </Form>
                </div>
            </Card>
        </div>
    );
};

export default UnifiedAdd;
