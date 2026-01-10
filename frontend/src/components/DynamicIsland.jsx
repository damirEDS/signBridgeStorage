import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingOutlined, CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';

const DynamicIsland = ({ state, message, minimal = false }) => {
    // state: 'idle' | 'loading' | 'success' | 'error'

    if (state === 'idle') return null;

    const getWidth = () => {
        if (minimal) return 120;
        if (state === 'loading') return 200;
        if (state === 'success') return 250;
        if (state === 'error') return 300;
        return 200;
    };

    const getColor = () => {
        if (state === 'error') return '#ff4d4f';
        return '#000';
    };

    return (
        <div style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
        }}>
            <AnimatePresence>
                <motion.div
                    initial={{ width: 0, height: 0, opacity: 0, borderRadius: 30 }}
                    animate={{
                        width: getWidth(),
                        height: minimal ? 35 : 50,
                        opacity: 1,
                        borderRadius: 30
                    }}
                    exit={{ width: 0, height: 0, opacity: 0 }}
                    style={{
                        background: getColor(),
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
                        {state === 'loading' && <LoadingOutlined spin style={{ fontSize: 20 }} />}
                        {state === 'success' && <CheckCircleFilled style={{ fontSize: 20, color: '#52c41a' }} />}
                        {state === 'error' && <CloseCircleFilled style={{ fontSize: 20, color: '#fff' }} />}

                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            style={{ fontWeight: 500 }}
                        >
                            {message}
                        </motion.span>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default DynamicIsland;
