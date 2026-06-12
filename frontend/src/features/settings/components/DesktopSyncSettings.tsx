import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api } from '@/services/api';
import { useSync } from '@/offline/SyncProvider';
import { RefreshCw, DownloadCloud } from 'lucide-react';

export function DesktopSyncSettings() {
    const { t } = useTranslation();
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { sync, isSyncing: syncing } = useSync();

    // Form fields
    const [remoteUrl, setRemoteUrl] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [autoSync, setAutoSync] = useState(true);
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

    useEffect(() => {
        loadConfig();
        
        if ((window as any).electronAPI?.onDownloadProgress) {
            (window as any).electronAPI.onDownloadProgress((pct: number) => {
                setDownloadProgress(pct);
                if (pct === 100) {
                    toast.success('Update downloaded! Please check the system prompt to restart.', { id: 'update-check' });
                    setTimeout(() => setDownloadProgress(null), 5000);
                }
            });
        }
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const res = await api.get('/desktop-config');
            setConfig(res.data);
            setRemoteUrl(res.data?.remoteUrl || '');
            setEmail(res.data?.syncEmail || '');
            setAutoSync(res.data?.autoSync !== false);
        } catch (error) {
            toast.error('Failed to load sync configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleManualSync = async () => {
        await sync();
        await loadConfig();
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            
            // 1. Authenticate with remote API
            if (!remoteUrl || !email || !password) {
                toast.error('Please provide URL, email and password');
                return;
            }

            // Remove trailing slash if present
            const baseUrl = remoteUrl.replace(/\/+$/, '');
            
            const authRes = await fetch(`${baseUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!authRes.ok) {
                throw new Error('Authentication failed. Check your credentials.');
            }

            const authData = await authRes.json();
            const syncToken = authData.access_token;

            if (!syncToken) {
                throw new Error('No access token received from remote server.');
            }

            // 2. Save configuration locally
            await api.post('/desktop-config', {
                remoteUrl: baseUrl,
                syncEmail: email,
                syncPassword: password,
                syncToken,
                autoSync,
            });
            toast.success('Configuration saved and connected');
            await loadConfig();
        } catch (error: any) {
            toast.error(error.message || 'Failed to connect and save configuration');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Cloud Synchronization
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Link this desktop application to your remote cloud workspace.
            </p>

            <div className="space-y-4 max-w-lg">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Remote API URL
                    </label>
                    <Input
                        type="url"
                        placeholder="https://my-stock-app.com/api"
                        value={remoteUrl}
                        onChange={(e) => setRemoteUrl(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                    </label>
                    <Input
                        type="email"
                        placeholder="admin@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Password
                    </label>
                    <Input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Your credentials will be used to generate a secure access token.
                    </p>
                </div>

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="autoSync"
                        checked={autoSync}
                        onChange={(e) => setAutoSync(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoSync" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                        Enable automatic background synchronization
                    </label>
                </div>

                {config?.clientId && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-semibold">Desktop Client ID:</span> {config.clientId}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-semibold">Last Sync:</span> {config.lastSyncAt ? new Date(config.lastSyncAt).toLocaleString() : 'Never'}
                        </p>
                    </div>
                )}

                <div className="pt-4 flex flex-wrap gap-3">
                    <Button onClick={handleSave} disabled={saving || syncing}>
                        {saving ? 'Connecting...' : 'Connect & Save'}
                    </Button>
                    {config?.remoteUrl && config?.syncToken && (
                        <Button
                            variant="outline"
                            onClick={handleManualSync}
                            disabled={syncing || saving}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Synchronizing...' : t('offline.sync.syncNow')}
                        </Button>
                    )}
                    
                    {downloadProgress !== null && (
                        <div className="w-full mt-4 bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                            <div 
                                className="bg-blue-600 h-4 transition-all duration-300 ease-out flex items-center justify-center text-[10px] font-bold text-white" 
                                style={{ width: `${downloadProgress}%` }}
                            >
                                {downloadProgress}%
                            </div>
                        </div>
                    )}
                    
                    {(window as any).electronAPI && downloadProgress === null && (
                        <Button
                            variant="outline"
                            onClick={async () => {
                                try {
                                    toast.loading('Checking for updates...', { id: 'update-check' });
                                    const res = await (window as any).electronAPI.checkForUpdates();
                                    if (res?.available) {
                                        toast.success(`Update v${res.version} found! Downloading in the background...`, { id: 'update-check' });
                                    } else if (res?.error) {
                                        toast.error(`Update check failed: ${res.error}`, { id: 'update-check' });
                                    } else {
                                        toast.info('You are already on the latest version.', { id: 'update-check' });
                                    }
                                } catch (e: any) {
                                    toast.error('Failed to check for updates', { id: 'update-check' });
                                }
                            }}
                        >
                            <DownloadCloud className="h-4 w-4 mr-2" />
                            Check for Updates
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
