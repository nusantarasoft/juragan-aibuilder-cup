/**
 * Export Utilities — PDF & Excel export helpers for audit compliance
 * Used across all admin modules for standardized data export.
 */

import dayjs from 'dayjs';
import { useAuthStore } from '@/store/useAuthStore';

// ─── Types ─────────────────────────────────────────────
export interface ExportColumn {
    /** Header label displayed in the exported file */
    header: string;
    /** dataIndex key to extract value from each record */
    key: string;
    /** Optional value formatter (e.g., currency, date) */
    format?: (value: any, record: any) => string;
    /** Column width for PDF (auto if not set) */
    width?: number;
}

export interface ExportOptions {
    /** File name (without extension) */
    fileName: string;
    /** Title shown at top of PDF */
    title: string;
    /** Optional subtitle (e.g., date range) */
    subtitle?: string;
    /** Column definitions */
    columns: ExportColumn[];
    /** Data rows */
    data: any[];
    /** Date range for the report header */
    dateRange?: { start: string; end: string };
}

// ─── Audit Log (fire-and-forget) ───────────────────────
const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';

async function logExportAudit(exportType: 'pdf' | 'excel', options: ExportOptions): Promise<void> {
    try {
        const user = useAuthStore.getState().user;
        if (!user) return;

        await fetch(GRAPHQL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `mutation($input: LogDataExportInput!) {
                    logDataExport(input: $input) { id }
                }`,
                variables: {
                    input: {
                        tenantId: '00000000-0000-0000-0000-000000000010',
                        userId: user.id,
                        userEmail: user.email,
                        userName: user.fullName,
                        exportType,
                        module: options.fileName,
                        fileName: `${options.fileName}_${dayjs().format('YYYY-MM-DD_HHmm')}.${exportType === 'excel' ? 'xlsx' : 'pdf'}`,
                        recordCount: options.data.length,
                        dateRangeStart: options.dateRange?.start || null,
                        dateRangeEnd: options.dateRange?.end || null,
                        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
                    },
                },
            }),
        });
    } catch {
        // Non-blocking: never fail an export because of audit logging
    }
}

// ─── Excel Export (XLSX) ───────────────────────────────
export async function exportToExcel(options: ExportOptions): Promise<void> {
    const XLSX = await import('xlsx');

    // Build header row + data rows
    const header = options.columns.map(c => c.header);
    const rows = options.data.map(record =>
        options.columns.map(col => {
            const val = record[col.key];
            return col.format ? col.format(val, record) : (val ?? '');
        })
    );

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

    // Auto-size columns
    ws['!cols'] = options.columns.map(col => ({
        wch: Math.max(
            col.header.length,
            ...rows.map(r => String(r[options.columns.indexOf(col)] ?? '').length)
        ) + 2,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');

    const dateStr = dayjs().format('YYYY-MM-DD_HHmm');
    XLSX.writeFile(wb, `${options.fileName}_${dateStr}.xlsx`);

    // Audit log (fire-and-forget)
    logExportAudit('excel', options);
}

// ─── PDF Export (jsPDF + autoTable) ────────────────────
export async function exportToPdf(options: ExportOptions): Promise<void> {
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(options.title, 14, 18);

    // Subtitle / Date range
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const sub = options.subtitle
        || (options.dateRange
            ? `Period: ${dayjs(options.dateRange.start).format('MMM D, YYYY')} — ${dayjs(options.dateRange.end).format('MMM D, YYYY')}`
            : `Generated: ${dayjs().format('MMM D, YYYY HH:mm')}`);
    doc.text(sub, 14, 24);

    // Company / footer text
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Nusantarasoft Admin — ${dayjs().format('YYYY-MM-DD HH:mm')}`, 14, 30);

    // Table
    const head = [options.columns.map(c => c.header)];
    const body = options.data.map(record =>
        options.columns.map(col => {
            const val = record[col.key];
            return col.format ? col.format(val, record) : String(val ?? '—');
        })
    );

    autoTable(doc, {
        startY: 34,
        head,
        body,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 8,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto',
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(
            `Page ${i} of ${pageCount}`,
            doc.internal.pageSize.getWidth() - 30,
            doc.internal.pageSize.getHeight() - 8
        );
    }

    const dateStr = dayjs().format('YYYY-MM-DD_HHmm');
    doc.save(`${options.fileName}_${dateStr}.pdf`);

    // Audit log (fire-and-forget)
    logExportAudit('pdf', options);
}
