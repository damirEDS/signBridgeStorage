import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import { Files, Glosses, Languages, Variants, Search, UnifiedAdd } from './pages';
import { ConfigProvider, theme } from 'antd';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loading...</div>; // Or a spinner
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return children;
};

const App = () => {
  // Theme State (Lifted up for now, could be in Context)
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              {/* Pass theme props to Layout if needed, but Context is better. 
                                For now, we will add a trivial way to toggle it in Sidebar? 
                                Actually, MainLayout needs access to setMode. 
                                Let's pass it via Outlet context or props if Layout handles it.
                             */}
              <MainLayout isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
            </ProtectedRoute>
          }>
            <Route index element={<Files />} />
            <Route path="glosses" element={<Glosses />} />
            <Route path="languages" element={<Languages />} />
            <Route path="variants" element={<Variants />} />
            <Route path="search" element={<Search />} />
            <Route path="unified-add" element={<UnifiedAdd />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App;
