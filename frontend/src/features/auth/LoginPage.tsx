import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';

export function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [searchParams] = useSearchParams();
    const fromParam = searchParams.get('from');
    const showRegister = fromParam === 'landing';
    const forgotPasswordLink = fromParam ? `/forgot-password?from=${fromParam}` : '/forgot-password';
    const registerLink = fromParam ? `/register?from=${fromParam}` : '/register';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || t('common.error'));
        } finally {
            setIsLoading(false);
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
                    <button
                        className="hidden"
                        onClick={() => {
                            throw new Error("Sentry Test Error from Frontend Login Page");
                        }}
                    >
                        Break the world
                    </button>
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Stock Management</h1>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('auth.login_subtitle')}</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Login Form */}
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
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('auth.password')}
                                </label>
                                <div className="text-sm">
                                    <Link to={forgotPasswordLink} className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                                        {t('auth.forgot_password', 'Forgot your password?')}
                                    </Link>
                                </div>
                            </div>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? t('common.loading') : t('auth.sign_in')}
                        </button>
                    </form>

                    {/* Register Link */}
                    {showRegister && (
                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {t('auth.no_account')}{' '}
                                <Link to={registerLink} className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                                    {t('auth.register')}
                                </Link>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>

    );
}
