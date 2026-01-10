import React from 'react';
import { Layout, Menu, Button, theme, Switch, Space } from 'antd';
import {
    FileOutlined,
    ReadOutlined,
    GlobalOutlined,
    PartitionOutlined,
    LogoutOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    SearchOutlined,
    RocketOutlined,
    BulbOutlined,
    BulbFilled
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Header, Sider, Content } = Layout;

const MainLayout = ({ isDarkMode, setIsDarkMode }) => {
    const [collapsed, setCollapsed] = React.useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    const menuItems = [
        {
            key: '/unified-add',
            icon: <RocketOutlined style={{ color: '#1890ff' }} />,
            label: 'Unified Import',
            style: { fontWeight: 'bold' }
        },
        {
            key: '/',
            icon: <FileOutlined />,
            label: 'Файлы',
        },
        {
            key: '/search',
            icon: <SearchOutlined />,
            label: 'Поиск каталога',
        },
        {
            key: '/glosses',
            icon: <ReadOutlined />,
            label: 'Глоссы',
        },
        {
            key: '/languages',
            icon: <GlobalOutlined />,
            label: 'Языки',
        },
        {
            key: '/variants',
            icon: <PartitionOutlined />,
            label: 'Варианты',
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed}>
                <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                    {collapsed ? 'SB' : 'SignBridge'}
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    onClick={({ key }) => navigate(key)}
                />
                <div style={{ position: 'absolute', bottom: 16, width: '100%', padding: '0 16px' }}>
                    <Button
                        type="text"
                        danger
                        icon={<LogoutOutlined />}
                        block={!collapsed}
                        onClick={logout}
                        style={{ color: '#ff4d4f' }}
                    >
                        {!collapsed && 'Выйти'}
                    </Button>
                </div>
            </Sider>
            <Layout>
                <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Button
                            type="text"
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setCollapsed(!collapsed)}
                            style={{ fontSize: '16px', width: 64, height: 64, marginRight: 16 }}
                        />
                        <h2 style={{ margin: 0, fontSize: '18px' }}>Административная панель</h2>
                    </div>

                    <Space>
                        <Switch
                            checkedChildren={<BulbFilled />}
                            unCheckedChildren={<BulbOutlined />}
                            checked={isDarkMode}
                            onChange={setIsDarkMode}
                        />
                    </Space>
                </Header>
                <Content
                    style={{
                        margin: '24px 16px',
                        padding: 24,
                        minHeight: 280,
                        background: colorBgContainer,
                        borderRadius: borderRadiusLG,
                    }}
                >
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;
