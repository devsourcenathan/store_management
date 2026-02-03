import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { adminBillingApi, PlatformPlan, api } from '@/services/api'; // Use api instance for orgs
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AssignSubscriptionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function AssignSubscriptionModal({ open, onOpenChange, onSuccess }: AssignSubscriptionModalProps) {
    const { register, handleSubmit, setValue, watch, formState: { isSubmitting } } = useForm();
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [plans, setPlans] = useState<PlatformPlan[]>([]);
    const [loading, setLoading] = useState(true);

    const isLifetime = watch('isLifetime');

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [orgsRes, plansData] = await Promise.all([
                api.get('/admin/organizations'),
                adminBillingApi.getPlans(true)
            ]);
            setOrganizations(orgsRes.data);
            setPlans(plansData);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleFormSubmit = async (data: any) => {
        console.log("Submitting:", data);
        try {
            await adminBillingApi.assignSubscription({
                organizationId: data.organizationId,
                planId: data.planId,
                billingCycle: data.isLifetime ? undefined : data.billingCycle,
                isLifetime: data.isLifetime,
                hideBillingUI: data.hideBillingUI,
            });
            toast.success('Subscription assigned');
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error('Failed to assign subscription');
        }
    };

    // Need to manually handle Select and Checkbox with react-hook-form
    // Or just use controlled inputs if easier, but let's stick to setValue

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Assign Subscription</DialogTitle>
                    <DialogDescription>Manually assign a plan to an organization.</DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : (
                    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Organization</Label>
                            <Select onValueChange={(v) => setValue('organizationId', v)} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Organization" />
                                </SelectTrigger>
                                <SelectContent>
                                    {organizations.map((org) => (
                                        <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Plan</Label>
                            <Select onValueChange={(v) => setValue('planId', v)} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {plans.map((plan) => (
                                        <SelectItem key={plan.id} value={plan.id}>{plan.name} ({plan.type})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {!isLifetime && (
                            <div className="space-y-2">
                                <Label>Billing Cycle</Label>
                                <Select onValueChange={(v) => setValue('billingCycle', v)} defaultValue="MONTHLY">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Cycle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                                        <SelectItem value="SEMI_ANNUAL">Semi-Annual</SelectItem>
                                        <SelectItem value="ANNUAL">Annual</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                                id="isLifetime"
                                onCheckedChange={(checked) => setValue('isLifetime', checked)}
                            />
                            <Label htmlFor="isLifetime" className="cursor-pointer">Lifetime Subscription (No Expiry)</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="hideBillingUI"
                                onCheckedChange={(checked) => setValue('hideBillingUI', checked)}
                            />
                            <Label htmlFor="hideBillingUI" className="cursor-pointer">Hide Billing UI (Stealth Mode)</Label>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Assign
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
