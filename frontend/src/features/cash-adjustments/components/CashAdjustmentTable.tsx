import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export interface CashAdjustment {
    id: string;
    storeId: string;
    date: string;
    expected: string;
    counted: string;
    difference: string;
    reason?: string;
    createdBy: string;
    createdAt: string;
}

interface CashAdjustmentTableProps {
    adjustments: CashAdjustment[];
    isLoading: boolean;
}

export function CashAdjustmentTable({ adjustments, isLoading }: CashAdjustmentTableProps) {
    const { t } = useTranslation();

    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('cash_adjustments.table.date')}</TableHead>
                        <TableHead className="text-right">{t('cash_adjustments.table.expected')}</TableHead>
                        <TableHead className="text-right">{t('cash_adjustments.table.counted')}</TableHead>
                        <TableHead className="text-right">{t('cash_adjustments.table.difference')}</TableHead>
                        <TableHead>{t('cash_adjustments.table.reason')}</TableHead>
                        <TableHead>{t('cash_adjustments.table.created_by')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                                {t('cash_adjustments.table.loading')}
                            </TableCell>
                        </TableRow>
                    ) : adjustments.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                {t('cash_adjustments.table.empty')}
                            </TableCell>
                        </TableRow>
                    ) : (
                        adjustments.map((a) => {
                            const diff = parseFloat(a.difference);
                            return (
                                <TableRow key={a.id}>
                                    <TableCell>{dayjs(a.date).format('DD/MM/YYYY HH:mm')}</TableCell>
                                    <TableCell className="text-right">{parseFloat(a.expected).toLocaleString()} F</TableCell>
                                    <TableCell className="text-right">{parseFloat(a.counted).toLocaleString()} F</TableCell>
                                    <TableCell className="text-right">
                                        {diff > 0 ? (
                                            <Badge variant="outline" className="text-emerald-500 bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
                                                +{diff.toLocaleString()} F
                                            </Badge>
                                        ) : diff < 0 ? (
                                            <Badge variant="outline" className="text-rose-500 bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800">
                                                {diff.toLocaleString()} F
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">0 F</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={a.reason}>
                                        {a.reason || <span className="text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell>{a.createdBy}</TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
