import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isDesktopBundle } from '@/lib/apiBaseUrl';
import { api } from '@/services/api';

export function DesktopSetupGuard({ children }: { children: React.ReactNode }) {
    const [isChecking, setIsChecking] = useState(isDesktopBundle());
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isDesktopBundle()) {
            setIsChecking(false);
            return;
        }

        const checkStatus = async () => {
            try {
                const res = await api.get('/desktop-config/status');
                if (!res.data.isConfigured && location.pathname !== '/setup') {
                    navigate('/setup', { replace: true });
                } else if (res.data.isConfigured && location.pathname === '/setup') {
                    navigate('/login', { replace: true });
                }
            } catch (err) {
                console.error('Failed to check desktop config status', err);
            } finally {
                setIsChecking(false);
            }
        };

        checkStatus();
    }, [navigate, location.pathname]);

    if (isChecking) {
        return (
            <div className="flex items-center justify-center h-screen w-full bg-gray-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Initialisation...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
