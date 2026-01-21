import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ExportColumn {
    header: string;
    key: string;
    width?: number;
}

export interface ExportOptions {
    title: string;
    columns: ExportColumn[];
    data: any[];
    organization?: {
        name?: string;
        logoUrl?: string;
        address?: string;
        phone?: string;
    };
    filename?: string;
}

export const exportService = {
    /**
     * Export data to PDF with organization branding
     */
    exportToPDF(options: ExportOptions) {
        const { title, columns, data, organization, filename } = options;
        const doc = new jsPDF();

        let yPosition = 20;

        // Add organization logo if available
        if (organization?.logoUrl) {
            try {
                // Note: For production, you'd need to handle image loading properly
                // This is a simplified version
                yPosition += 10;
            } catch (error) {
                console.error('Error loading logo:', error);
            }
        }

        // Add organization name
        if (organization?.name) {
            doc.setFontSize(12);
            doc.setTextColor(100);
            doc.text(organization.name, 14, yPosition);
            yPosition += 6;
        }

        // Add organization details
        if (organization?.address || organization?.phone) {
            doc.setFontSize(9);
            doc.setTextColor(150);
            if (organization.address) {
                doc.text(organization.address, 14, yPosition);
                yPosition += 5;
            }
            if (organization.phone) {
                doc.text(organization.phone, 14, yPosition);
                yPosition += 5;
            }
            yPosition += 5;
        }

        // Add title
        doc.setFontSize(18);
        doc.setTextColor(0);
        doc.text(title, 14, yPosition);
        yPosition += 10;

        // Add date
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, yPosition);
        yPosition += 10;

        // Add table
        autoTable(doc, {
            head: [columns.map(col => col.header)],
            body: data.map(row => columns.map(col => {
                const value = row[col.key];
                // Handle different data types
                if (value === null || value === undefined) return '';
                if (typeof value === 'object') return JSON.stringify(value);
                return String(value);
            })),
            startY: yPosition,
            styles: {
                fontSize: 9,
                cellPadding: 3,
            },
            headStyles: {
                fillColor: [99, 102, 241], // Indigo color
                textColor: 255,
                fontStyle: 'bold',
            },
            alternateRowStyles: {
                fillColor: [245, 247, 250],
            },
        });

        // Save the PDF
        const finalFilename = filename || `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(finalFilename);
    },

    /**
     * Export data to Excel
     */
    exportToExcel(options: ExportOptions) {
        const { title, data, filename } = options;

        // Convert data to worksheet
        const ws = XLSX.utils.json_to_sheet(data);

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31)); // Sheet name max 31 chars

        // Save the file
        const finalFilename = filename || `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, finalFilename);
    },

    /**
     * Export data to CSV
     */
    exportToCSV(options: ExportOptions) {
        const { title, data, filename } = options;

        // Convert data to worksheet
        const ws = XLSX.utils.json_to_sheet(data);

        // Convert to CSV
        const csv = XLSX.utils.sheet_to_csv(ws);

        // Create blob and download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const finalFilename = filename || `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        link.setAttribute('download', finalFilename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
