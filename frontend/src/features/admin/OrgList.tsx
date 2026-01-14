import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

import { api } from '@/services/api';

export const OrgList = () => {
    const [orgs, setOrgs] = useState<any[]>([]);

    useEffect(() => {
        api.get('/admin/organizations')
            .then(res => setOrgs(res.data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Organizations</h2>
                {/* <Button>Create Organization</Button> */}
            </div>
            <div className="grid gap-4">
                {orgs.map((org: any) => (
                    <Card key={org.id}>
                        <CardHeader>
                            <CardTitle>{org.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-slate-500">
                                <p>Email: {org.email || 'N/A'}</p>
                                <p>Stores: {org._count?.stores || 0}</p>
                                <p>Users: {org._count?.users || 0}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};
