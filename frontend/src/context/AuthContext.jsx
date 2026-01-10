import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';
import { message } from 'antd';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // Ideally fetch user profile here
            setUser({ name: 'Admin' });
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            const res = await client.post('/api/v1/auth/login', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const { access_token } = res.data;
            localStorage.setItem('token', access_token);
            setUser({ name: 'Admin' });
            message.success('Вход выполнен');
            return true;
        } catch (error) {
            message.error('Ошибка входа: ' + (error.response?.data?.detail || error.message));
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        message.info('Выход выполнен');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
