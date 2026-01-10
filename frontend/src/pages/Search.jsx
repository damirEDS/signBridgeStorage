import React, { useState, useEffect } from 'react';
import { Card, Input, Select, InputNumber, Button, Row, Col, Typography, Tag, Divider, Collapse, Space, message, Radio, Table, Drawer, Statistic } from 'antd';
import { SearchOutlined, FilterOutlined, CopyOutlined, PlayCircleOutlined } from '@ant-design/icons';
import client from '../api/client';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

const Search = () => {
    // Filters
    const [query, setQuery] = useState('');
    const [language, setLanguage] = useState(null);
    const [emotion, setEmotion] = useState(null);
    const [minFps, setMinFps] = useState(null);
    const [maxFps, setMaxFps] = useState(null);
    const [minDuration, setMinDuration] = useState(null);
    const [maxDuration, setMaxDuration] = useState(null);
    const [sortBy, setSortBy] = useState('-created_at');

    // Data
    const [results, setResults] = useState([]);
    const [languages, setLanguages] = useState([]);
    const [loading, setLoading] = useState(false);

    // Request Info
    const [requestUrl, setRequestUrl] = useState('');
    const [jsonResponse, setJsonResponse] = useState('');

    // Drawer State
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showJson, setShowJson] = useState(false);

    useEffect(() => {
        // Load initial languages
        client.get('/api/v1/cms/languages').then(res => setLanguages(res.data)).catch(() => { });
    }, []);

    useEffect(() => {
        handleSearch(); // Auto-fetch on mount and update
    }, [language, emotion, minFps, maxFps, minDuration, maxDuration, sortBy]); // Re-fetch when filters change

    const handleSearch = async () => {
        setLoading(true);
        try {
            const params = {};
            if (query) params.q = query;
            if (language) params.language_id = language;
            if (emotion) params.emotion = emotion;
            if (minFps) params.min_fps = minFps;
            if (maxFps) params.max_fps = maxFps;
            if (minDuration) params.min_duration = minDuration;
            if (maxDuration) params.max_duration = maxDuration;
            if (sortBy) params.sort_by = sortBy;

            // Constuct Request URL for display
            const queryString = new URLSearchParams(params).toString();
            const fullUrl = `/api/v1/cms/search?${queryString}`;
            setRequestUrl(fullUrl);

            const res = await client.get('/api/v1/cms/search', { params });
            setResults(res.data);
            setJsonResponse(JSON.stringify(res.data, null, 2));
        } catch (error) {
            // Quiet fail or showing error only on manual action? 
            // Better to show message only if it's a real error, not just 'not found'
            console.error(error);
        } finally {
            setLoading(false);
        }
    };


    const generateCurl = () => {
        const baseUrl = window.location.origin.replace('3000', '8000'); // Assuming standard dev ports
        return `curl -X GET "${baseUrl}${requestUrl}" -H "accept: application/json"`;
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        message.success('Copied!');
    };

    return (
        <div>
            <Title level={4}>Поиск с фильтрацией (Advanced Search)</Title>

            <Row gutter={24}>
                {/* LEFT COLUMN: Results & Query */}
                <Col flex="auto">
                    {/* Main Search Bar */}
                    <Card style={{ marginBottom: 24 }}>
                        <Row gutter={16}>
                            <Col span={20}>
                                <Input
                                    placeholder="Поиск по глоссу или синонимам"
                                    prefix={<SearchOutlined />}
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    onPressEnter={handleSearch}
                                    size="large"
                                />
                            </Col>
                            <Col span={4}>
                                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} loading={loading} size="large" block>
                                    Найти
                                </Button>
                            </Col>
                        </Row>

                        {/* Short Status */}
                        <div style={{ marginTop: 16 }}>
                            <Text type="secondary">Найдено записей: {results.length}</Text>
                        </div>
                    </Card>
                    {/* Results Table */}
                    <Table
                        dataSource={results}
                        rowKey="id"
                        pagination={{ pageSize: 20 }}
                        loading={loading}
                        onRow={(record) => ({
                            onClick: () => {
                                setSelectedItem(record);
                                setDrawerVisible(true);
                            },
                            style: { cursor: 'pointer' }
                        })}
                        columns={[
                            {
                                title: 'ID',
                                dataIndex: 'id',
                                width: 80,
                                render: (text) => <Text type="secondary" code>#{text}</Text>
                            },
                            {
                                title: 'Gloss',
                                dataIndex: ['gloss', 'name'],
                                render: (text) => <Text strong>{text}</Text>,
                                sorter: (a, b) => a.gloss.name.localeCompare(b.gloss.name)
                            },
                            {
                                title: 'Language',
                                dataIndex: ['language', 'name'],
                                width: 120,
                                render: (text, record) => <Tag color="blue">{text}</Tag>
                            },
                            {
                                title: 'Emotion',
                                dataIndex: 'emotion',
                                width: 100,
                                render: (text) => <Tag color={text === 'Neutral' ? 'default' : 'orange'}>{text}</Tag>
                            },
                            {
                                title: 'FPS',
                                dataIndex: ['asset', 'framerate'],
                                width: 80,
                            },
                            {
                                title: 'Duration',
                                dataIndex: ['asset', 'duration'],
                                width: 100,
                                render: (val) => val ? `${val}s` : '-'
                            },
                            {
                                title: 'Type',
                                dataIndex: 'type',
                                width: 100,
                            }
                        ]}
                    />
                </Col>
                <Col flex="300px">
                    <Card
                        title={<Space><FilterOutlined /> Фильтры</Space>}
                        size="small"
                        bodyStyle={{ padding: 0 }}
                    >
                        {/* Sorting */}
                        <div style={{ padding: '16px' }}>
                            <Text strong>Сортировка</Text>
                            <div style={{ marginTop: 8 }}>
                                <Select
                                    style={{ width: '100%' }}
                                    value={sortBy}
                                    onChange={setSortBy}
                                >
                                    <Option value="-created_at">Сначала новые</Option>
                                    <Option value="created_at">Сначала старые</Option>
                                    <Option value="duration">Длительность (по возр.)</Option>
                                    <Option value="-duration">Длительность (по убыв.)</Option>
                                </Select>
                            </div>
                        </div>
                        <Divider style={{ margin: 0 }} />

                        {/* Language Filter */}
                        <div style={{ padding: '16px' }}>
                            <Text strong>Язык</Text>
                            <div style={{ marginTop: 8 }}>
                                <Radio.Group
                                    value={language}
                                    onChange={e => setLanguage(e.target.value)}
                                    style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                                >
                                    <Radio value={null}>Все</Radio>
                                    {languages.map(l => (
                                        <Radio key={l.code} value={l.code}>{l.name}</Radio>
                                    ))}
                                </Radio.Group>
                            </div>
                        </div>
                        <Divider style={{ margin: 0 }} />

                        {/* Emotion Filter */}
                        <div style={{ padding: '16px' }}>
                            <Text strong>Эмоция</Text>
                            <div style={{ marginTop: 8 }}>
                                <Radio.Group
                                    value={emotion}
                                    onChange={e => setEmotion(e.target.value)}
                                    style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                                >
                                    <Radio value={null}>Любая</Radio>
                                    <Radio value="Neutral">Neutral</Radio>
                                    <Radio value="Happy">Happy</Radio>
                                    <Radio value="Sad">Sad</Radio>
                                    <Radio value="Angry">Angry</Radio>
                                    <Radio value="Question">Question</Radio>
                                </Radio.Group>
                            </div>
                        </div>
                        <Divider style={{ margin: 0 }} />

                        {/* FPS Filter */}
                        <div style={{ padding: '16px' }}>
                            <Text strong>FPS</Text>
                            <div style={{ marginTop: 8 }}>
                                <Radio.Group
                                    value={minFps}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setMinFps(val);
                                        setMaxFps(val);
                                    }}
                                    buttonStyle="solid"
                                    style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
                                >
                                    <Radio.Button value={null}>All</Radio.Button>
                                    <Radio.Button value={24}>24</Radio.Button>
                                    <Radio.Button value={30}>30</Radio.Button>
                                    <Radio.Button value={60}>60</Radio.Button>
                                    <Radio.Button value={100}>100</Radio.Button>
                                </Radio.Group>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Detail Drawer */}
            <Drawer
                title={selectedItem?.gloss?.name || 'Детали'}
                placement="right"
                onClose={() => setDrawerVisible(false)}
                open={drawerVisible}
                width={600}
            >
                {selectedItem && (
                    <div>
                        <div style={{ marginBottom: 16, textAlign: 'right' }}>
                            <Button
                                type={showJson ? 'primary' : 'default'}
                                onClick={() => setShowJson(!showJson)}
                            >
                                {showJson ? 'Показать UI' : 'Показать JSON'}
                            </Button>
                        </div>

                        {showJson ? (
                            <Input.TextArea
                                value={JSON.stringify(selectedItem, null, 2)}
                                rows={25}
                                readOnly
                                style={{ fontFamily: 'monospace', fontSize: 12, background: '#111', color: '#0f0' }}
                            />
                        ) : (
                            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                                {/* Video Player */}
                                {selectedItem.asset.file_url ? (
                                    <div style={{ background: '#000', borderRadius: 8, overflow: 'hidden' }}>
                                        <video controls style={{ width: '100%', display: 'block' }} src={selectedItem.asset.file_url} />
                                    </div>
                                ) : (
                                    <div style={{ padding: 40, textAlign: 'center', background: '#f5f5f5', borderRadius: 8 }}>
                                        No Video
                                    </div>
                                )}

                                {/* Key Metadata */}
                                <Card size="small" title="Основная информация">
                                    <Paragraph><Text strong>ID:</Text> {selectedItem.id}</Paragraph>
                                    <Paragraph><Text strong>Язык:</Text> <Tag color="blue">{selectedItem.language.name}</Tag></Paragraph>
                                    <Paragraph><Text strong>Эмоция:</Text> <Tag color="orange">{selectedItem.emotion}</Tag></Paragraph>
                                    <Paragraph><Text strong>Глосс:</Text> {selectedItem.gloss.name}</Paragraph>
                                </Card>

                                {/* Technical Specs */}
                                <Card size="small" title="Технические параметры">
                                    <Row gutter={16}>
                                        <Col span={8}>
                                            <Statistic title="FPS" value={selectedItem.asset.framerate} />
                                        </Col>
                                        <Col span={8}>
                                            <Statistic title="Duration" value={selectedItem.asset.duration} precision={2} suffix="s" />
                                        </Col>
                                        <Col span={8}>
                                            <Statistic title="Frames" value={selectedItem.asset.frame_count} />
                                        </Col>
                                    </Row>
                                </Card>

                                {/* Transition Info */}
                                <Card size="small" title="Параметры Переходов">
                                    <Paragraph><Text strong>Transition In:</Text> {selectedItem.asset.transition_in || <Text type="secondary" italic>Не задано</Text>}</Paragraph>
                                    <Paragraph><Text strong>Transition Out:</Text> {selectedItem.asset.transition_out || <Text type="secondary" italic>Не задано</Text>}</Paragraph>
                                </Card>
                            </Space>
                        )}
                    </div>
                )}
            </Drawer>
        </div>
    );
};

export default Search;
