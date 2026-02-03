import React, { useEffect, useState } from 'react';
import { adminBillingApi, OrganizationSubscription } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AssignSubscriptionModal } from './components/AssignSubscriptionModal';
import { format } from 'date-fns';

export default function AdminSubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAssignOpen, setIsAssignOpen] = useState(false);

    useEffect(() => {
        loadSubscriptions();
    }, []);

    const loadSubscriptions = async () => {
        setLoading(true);
        try {
            const data = await adminBillingApi.getSubscriptions();
            setSubscriptions(data);
        } catch (error) {
            toast.error('Failed to load subscriptions');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm('Are you sure you want to cancel this subscription?')) return;
        try {
            await adminBillingApi.cancelSubscription(id);
            toast.success('Subscription cancelled');
            loadSubscriptions();
        } catch (error) {
            toast.error('Failed to cancel subscription');
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-foreground">Manage Subscriptions</h1>
                <Button onClick={() => setIsAssignOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Assign Subscription
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-foreground">Organization Subscriptions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Organization</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Cycle</TableHead>
                                <TableHead>Expires</TableHead>
                                <TableHead>Attributes</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subscriptions.map((sub) => (
                                <TableRow key={sub.id}>
                                    <TableCell className="font-medium text-foreground">{sub.organization?.name || 'Unknown'}</TableCell>
                                    <TableCell className="text-foreground">{sub.plan?.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={sub.status === 'ACTIVE' ? 'default' : sub.status === 'LIFETIME' ? 'secondary' : 'outline'}>
                                            {sub.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-foreground">{sub.isLifetime ? 'Lifetime' : sub.billingCycle}</TableCell>
                                    <TableCell className="text-foreground">
                                        {sub.isLifetime ? 'Never' : sub.currentPeriodEnd ? format(new Date(sub.currentPeriodEnd), 'PP') : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {sub.hideBillingUI && <Badge variant="outline" className="mr-1">Stealth</Badge>}
                                        {sub.assignedByAdmin && <Badge variant="outline">Manual</Badge>}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex space-x-2">
                                            {sub.status !== 'CANCELLED' && sub.status !== 'EXPIRED' && (
                                                <Button variant="ghost" size="sm" onClick={() => handleCancel(sub.id)} title="Cancel Subscription">
                                                    <XCircle className="h-4 w-4 text-destructive" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {subscriptions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">No subscriptions found</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AssignSubscriptionModal
                open={isAssignOpen}
                onOpenChange={setIsAssignOpen}
                onSuccess={loadSubscriptions}
            />
        </div>
    );
}
