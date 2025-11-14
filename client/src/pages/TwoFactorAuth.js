import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

const TwoFactorAuth = () => {
    const { user } = useAuth();
    const [qrCode, setQrCode] = useState(null);
    const [token, setToken] = useState('');
    const [is2FAEnabled, setIs2FAEnabled] = useState(user?.two_factor_enabled || false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setIs2FAEnabled(user?.two_factor_enabled || false);
    }, [user]);

    const handleEnable2FA = async () => {
        setLoading(true);
        try {
            const { data } = await api.post('/auth/2fa/setup');
            setQrCode(data.qrCodeUrl);
        } catch (error) {
            toast.error('Failed to start 2FA setup. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify2FA = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/2fa/verify', { token });
            toast.success('2FA enabled successfully!');
            setIs2FAEnabled(true);
            setQrCode(null);
            // NOTE: You might need to refresh user context here to get the updated user state
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid 2FA token.');
        } finally {
            setLoading(false);
        }
    };

    const handleDisable2FA = async () => {
        if (!window.confirm('Are you sure you want to disable 2FA?')) return;
        setLoading(true);
        try {
            await api.post('/auth/2fa/disable');
            toast.success('2FA disabled successfully.');
            setIs2FAEnabled(false);
            // NOTE: You might need to refresh user context here
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to disable 2FA.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Sidebar />
            <div className="lg:pl-64">
                <Header />
                <main className="py-6">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="card">
                            <div className="card-body">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                    Two-Factor Authentication (2FA)
                                </h1>
                                {is2FAEnabled ? (
                                    <div>
                                        <p className="text-green-600 dark:text-green-400 mb-4">
                                            2FA is currently enabled on your account.
                                        </p>
                                        <button onClick={handleDisable2FA} className="btn btn-danger" disabled={loading}>
                                            {loading ? 'Disabling...' : 'Disable 2FA'}
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        {!qrCode ? (
                                            <div>
                                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                                    Enhance your account security by enabling 2FA.
                                                </p>
                                                <button onClick={handleEnable2FA} className="btn btn-primary" disabled={loading}>
                                                    {loading ? 'Generating QR Code...' : 'Enable 2FA'}
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="mb-4">1. Scan the QR code with your authenticator app (e.g., Google Authenticator).</p>
                                                <img src={qrCode} alt="2FA QR Code" className="mx-auto my-4 p-2 bg-white" />
                                                <p className="mb-4">2. Enter the 6-digit code from your app to verify and complete the setup.</p>
                                                <form onSubmit={handleVerify2FA} className="flex items-center gap-4">
                                                    <input
                                                        type="text"
                                                        value={token}
                                                        onChange={(e) => setToken(e.target.value)}
                                                        placeholder="Enter 6-digit code"
                                                        className="input"
                                                        maxLength="6"
                                                        required
                                                    />
                                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                                        {loading ? 'Verifying...' : 'Verify & Enable'}
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="mt-6">
                                    <Link to="/profile" className="text-primary-600 hover:underline">
                                        &larr; Back to Profile
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default TwoFactorAuth;
