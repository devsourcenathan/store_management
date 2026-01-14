import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface AuditLog {
    id: string;
    action: string;
    entity: string;
    changes: any;
    createdAt: string;
    user: {
        firstName: string;
        lastName: string;
        email: string;
    };
}

export const AuditHistory = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const { data } = await api.get('/org-landing/audit');
            setLogs(data);
        } catch (error) {
            console.error('Failed to fetch audit logs', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading history...</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Change History</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {logs.length === 0 ? (
                        <p className="text-gray-500">No history found.</p>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="border-b last:border-0 pb-4 last:pb-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-sm">{log.action}</p>
                                        <p className="text-xs text-gray-500">
                                            By {log.user.firstName} {log.user.lastName} ({log.user.email})
                                        </p>
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {format(new Date(log.createdAt), 'PPpp')}
                                    </span>
                                </div>
                                <div className="mt-2 text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-auto max-h-32 font-mono">
                                    {JSON.stringify(log.changes, null, 2)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
