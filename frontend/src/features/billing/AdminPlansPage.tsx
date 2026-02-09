import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminBillingApi, PlatformPlan } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PlanForm } from './components/PlanForm';

export default function AdminPlansPage() {
    const { t } = useTranslation();
    const [plans, setPlans] = useState<PlatformPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<PlatformPlan | null>(null);

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        try {
            const data = await adminBillingApi.getPlans(true);
            setPlans(data);
        } catch (error) {
            toast.error('Failed to load plans');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingPlan(null);
        setIsFormOpen(true);
    };

    const handleEdit = (plan: PlatformPlan) => {
        setEditingPlan(plan);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to deactivate this plan?')) return;
        try {
            await adminBillingApi.deletePlan(id);
            toast.success('Plan deactivated');
            loadPlans();
        } catch (error) {
            toast.error('Failed to deactivate plan');
        }
    };

    const handleFormSubmit = async (data: any) => {
        try {
            if (editingPlan) {
                await adminBillingApi.updatePlan(editingPlan.id, data);
                toast.success('Plan updated');
            } else {
                await adminBillingApi.createPlan(data);
                toast.success('Plan created');
            }
            setIsFormOpen(false);
            loadPlans();
        } catch (error) {
            toast.error('Failed to save plan');
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-foreground">{t('billing.managePlans', 'Manage Plans')}</h1>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('billing.addPlan', 'Add Plan')}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-foreground">{t('billing.plansList', 'Available Plans')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('name', 'Name')}</TableHead>
                                <TableHead>{t('type', 'Type')}</TableHead>
                                <TableHead>{t('price', 'Monthly Price')}</TableHead>
                                <TableHead>{t('limits', 'Limits')}</TableHead>
                                <TableHead>{t('status', 'Status')}</TableHead>
                                <TableHead>{t('actions', 'Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {plans.map((plan) => (
                                <TableRow key={plan.id}>
                                    <TableCell className="font-medium text-foreground">{plan.name}</TableCell>
                                    <TableCell><Badge variant="outline">{plan.type}</Badge></TableCell>
                                    <TableCell className="text-foreground">{new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF' }).format(plan.monthlyPrice)}</TableCell>
                                    <TableCell>
                                        <div className="text-xs text-muted-foreground">
                                            <div>Stores: {plan.maxStores ?? '∞'}</div>
                                            <div>Products: {plan.maxProducts ?? '∞'}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                                            {plan.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex space-x-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(plan)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(plan.id)}>
                                                <Trash className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <PlanForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSubmit={handleFormSubmit}
                initialData={editingPlan}
            />
        </div>
    );
}
