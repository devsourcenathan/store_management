import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { Badge } from '@/components/ui/badge';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export interface MiscTransaction {
    id: string;
    storeId: string;
    date: string;
    type: 'IN' | 'OUT';
    amount: string;
    description: string;
    createdBy: string;
    createdAt: string;
}

interface MiscTransactionTableProps {
    transactions: MiscTransaction[];
    isLoading: boolean;
}

export function MiscTransactionTable({ transactions, isLoading }: MiscTransactionTableProps) {
    const { t } = useTranslation();

    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('misc_transactions.table.date')}</TableHead>
                        <TableHead>{t('misc_transactions.table.type')}</TableHead>
                        <TableHead className="text-right">{t('misc_transactions.table.amount')}</TableHead>
                        <TableHead>{t('misc_transactions.table.description')}</TableHead>
                        <TableHead>{t('misc_transactions.table.created_by')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                                {t('misc_transactions.table.loading')}
                            </TableCell>
                        </TableRow>
                    ) : transactions.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                {t('misc_transactions.table.empty')}
                            </TableCell>
                        </TableRow>
                    ) : (
                        transactions.map((transaction) => {
                            const isOut = transaction.type === 'OUT';
                            return (
                                <TableRow key={transaction.id}>
                                    <TableCell>{dayjs(transaction.date).format('DD/MM/YYYY HH:mm')}</TableCell>
                                    <TableCell>
                                        {isOut ? (
                                            <Badge variant="outline" className="text-rose-500 bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800">
                                                <ArrowDownCircle className="w-3 h-3 mr-1" />
                                                {t('misc_transactions.table.type_out')}
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-emerald-500 bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
                                                <ArrowUpCircle className="w-3 h-3 mr-1" />
                                                {t('misc_transactions.table.type_in')}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${isOut ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {isOut ? '-' : '+'}{parseFloat(transaction.amount).toLocaleString('fr-FR')} F
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={transaction.description}>
                                        {transaction.description}
                                    </TableCell>
                                    <TableCell>{transaction.createdBy}</TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
