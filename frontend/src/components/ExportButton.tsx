import { Button } from '@/components/ui/button';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { exportService, ExportColumn } from '@/services/exportService';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface ExportButtonProps {
    data: any[];
    columns: ExportColumn[];
    title: string;
    format: 'pdf' | 'excel' | 'csv';
    filename?: string;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg';
    className?: string;
}

export function ExportButton({
    data,
    columns,
    title,
    format,
    filename,
    variant = 'outline',
    size = 'default',
    className
}: ExportButtonProps) {
    const { organization } = useOrganization();
    const { t } = useTranslation();

    const handleExport = () => {
        try {
            const exportOptions = {
                title,
                columns,
                data,
                organization: {
                    name: organization?.name,
                    logoUrl: organization?.logoUrl,
                    address: organization?.address,
                    phone: organization?.phone,
                },
                filename
            };

            switch (format) {
                case 'pdf':
                    exportService.exportToPDF(exportOptions);
                    break;
                case 'excel':
                    exportService.exportToExcel(exportOptions);
                    break;
                case 'csv':
                    exportService.exportToCSV(exportOptions);
                    break;
            }

            toast.success(t('export.success'));
        } catch (error) {
            console.error('Export error:', error);
            toast.error(t('export.error'));
        }
    };

    const getIcon = () => {
        switch (format) {
            case 'pdf':
                return <FileText className="w-4 h-4" />;
            case 'excel':
                return <FileSpreadsheet className="w-4 h-4" />;
            case 'csv':
                return <Download className="w-4 h-4" />;
        }
    };

    const getLabel = () => {
        switch (format) {
            case 'pdf':
                return t('export.pdf');
            case 'excel':
                return t('export.excel');
            case 'csv':
                return t('export.csv');
        }
    };

    return (
        <Button
            onClick={handleExport}
            variant={variant}
            size={size}
            className={className}
            disabled={!data || data.length === 0}
        >
            {getIcon()}
            <span className="ml-2">{getLabel()}</span>
        </Button>
    );
}
