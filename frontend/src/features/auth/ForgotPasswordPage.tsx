import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import axios from 'axios';

export function ForgotPasswordPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const fromParam = searchParams.get('from');
    const loginLink = fromParam ? `/login?from=${fromParam}` : '/login';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            await axios.post(`${apiUrl}/auth/forgot-password`, {
                email,
                origin: window.location.origin
            });
            setStatus('success');
            setMessage(t('auth.reset_email_sent', 'Check your email for a reset link.'));
        } catch (error: any) {
            setStatus('error');
            setMessage(error.response?.data?.message || t('common.error', 'An error occurred'));
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 transition-colors">
            <div className="absolute top-4 right-4 flex gap-2">
                <LanguageSelector />
                <ThemeToggle />
            </div>

            <div className="max-w-md w-full space-y-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 transition-colors">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('auth.forgot_password', 'Forgot Password')}</h1>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {t('auth.forgot_password_subtitle', 'Enter your email to receive a reset link')}
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
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('auth.email')}
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="you@example.com"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {status === 'loading' ? t('common.loading') : t('auth.send_reset_link', 'Send Reset Link')}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <Link to={loginLink} className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                            {t('auth.back_to_login', 'Back to Login')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
