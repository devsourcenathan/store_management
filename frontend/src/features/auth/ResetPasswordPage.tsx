import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import axios from 'axios';

export function ResetPasswordPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setMessage(t('auth.passwords_do_not_match', 'Passwords do not match'));
            setStatus('error');
            return;
        }

        setStatus('loading');
        setMessage('');

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            await axios.post(`${apiUrl}/auth/reset-password`, { token, password });
            setStatus('success');
            setMessage(t('auth.password_reset_success', 'Password reset successfully. You can now login.'));
            setTimeout(() => navigate('/login'), 3000);
        } catch (error: any) {
            setStatus('error');
            setMessage(error.response?.data?.message || t('common.error', 'An error occurred'));
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Invalid Link</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">This password reset link is invalid or missing a token.</p>
                    <Link to="/login" className="text-blue-600 hover:text-blue-500">Back to Login</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 transition-colors">
            <div className="absolute top-4 right-4 flex gap-2">
                <LanguageSelector />
                <ThemeToggle />
            </div>

            <div className="max-w-md w-full space-y-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 transition-colors">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('auth.reset_password', 'Reset Password')}</h1>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {t('auth.reset_password_subtitle', 'Enter your new password')}
                        </p>
                    </div>

                    {message && (
                        <div className={`mb-4 p-3 border rounded-lg ${status === 'success'
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                            }`}>
                            <p className="text-sm">{message}</p>
                        </div>
                    )}

                    {status !== 'success' && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('auth.new_password', 'New Password')}
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    minLength={6}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('auth.confirm_password', 'Confirm Password')}
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    required
                                    minLength={6}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {status === 'loading' ? t('common.loading') : t('auth.reset_password_button', 'Reset Password')}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
