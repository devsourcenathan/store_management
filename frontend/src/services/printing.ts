export const printer = {
    printInvoice: (
        sale: any,
        storeName: string = "STORE MANAGEMENT",
        t: (key: string) => string = (key) => key,
        branding?: {
            organizationName?: string;
            logoUrl?: string;
            footer?: string;
            address?: string;
            phone?: string;
            email?: string;
            website?: string;
            taxId?: string;
        }
    ) => {
        const win = window.open('', '', 'width=800,height=600');
        if (!win) return;

        const date = new Date(sale.createdAt).toLocaleDateString();
        const time = new Date(sale.createdAt).toLocaleTimeString();

        // Helper to get translated string with fallback
        const tr = (key: string, defaultText: string) => {
            const translated = t(key);
            return translated === key ? defaultText : translated;
        };

        const receiptNo = sale.id?.slice?.(0, 8)?.toUpperCase?.() || '';
        const logoUrl = branding?.logoUrl;
        const orgName = branding?.organizationName || storeName;

        const html = `
            <html>
            <head>
                <title>${tr('invoice.title', 'INVOICE')} #${receiptNo}</title>
                <style>
                    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Liberation Sans", sans-serif; background: #fff; color: #111827; padding: 16px; }
                    .receipt { max-width: 430px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px; }
                    .header { text-align: center; padding-bottom: 12px; border-bottom: 1px dashed #9ca3af; }
                    .logo { height: 52px; max-width: 100%; object-fit: contain; margin: 0 auto 8px; display: block; }
                    .org-name { font-size: 18px; font-weight: 800; letter-spacing: .2px; }
                    .store-name { font-size: 12px; color: #6b7280; margin-top: 2px; }
                    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; margin-top: 12px; font-size: 12px; }
                    .meta-grid .cell { display: flex; justify-content: space-between; gap: 8px; }
                    .meta-grid .label { color: #6b7280; }
                    .meta-grid .value { font-weight: 600; color: #111827; }
                    .items { margin-top: 12px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th { text-align: left; font-size: 11px; color: #6b7280; font-weight: 700; border-bottom: 1px solid #e5e7eb; padding: 8px 0; }
                    td { padding: 6px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
                    th.qty, td.qty { text-align: center; width: 56px; }
                    th.total, td.total { text-align: right; width: 90px; }
                    .name { font-weight: 600; }
                    .muted { color: #6b7280; font-weight: 500; }
                    .totals { margin-top: 12px; padding-top: 12px; border-top: 1px dashed #9ca3af; font-size: 12px; }
                    .row { display: flex; justify-content: space-between; margin: 6px 0; }
                    .grand { font-size: 16px; font-weight: 800; margin-top: 8px; }
                    .footer { text-align: center; font-size: 10px; color: #6b7280; margin-top: 14px; }
                    .footer p { margin: 4px 0; }
                    @media print { @page { margin: 0; } body { padding: 10px; } .receipt { border: none; border-radius: 0; padding: 0; } }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <div class="header">
                        ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="Logo" />` : ''}
                        <div class="org-name">${orgName}</div>
                        <div class="store-name">${storeName || ''}</div>

                        <div class="meta-grid">
                            <div class="cell"><span class="label">${tr('invoice.date', 'Date')}</span><span class="value">${date} ${time}</span></div>
                            <div class="cell"><span class="label">${tr('invoice.receipt', 'Receipt')}</span><span class="value">#${receiptNo}</span></div>
                            ${sale.customer ? `<div class="cell" style="grid-column: 1 / -1;"><span class="label">${tr('invoice.customer', 'Customer')}</span><span class="value">${sale.customer.name}</span></div>` : ''}
                        </div>
                    </div>

                    <div class="items">
                        <table>
                            <thead>
                                <tr>
                                    <th>${tr('invoice.item', 'Item')}</th>
                                    <th class="qty">${tr('invoice.qty', 'Qty')}</th>
                                    <th class="total">${tr('invoice.total', 'Total')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(sale.items || []).map((item: any) => `
                                    <tr>
                                        <td>
                                            <div class="name">${item.product?.name || item.name || 'Unknown Item'}</div>
                                            ${item.product?.sku ? `<div class="muted">${item.product.sku}</div>` : ''}
                                        </td>
                                        <td class="qty">${Number(item.quantity || 0)}</td>
                                        <td class="total">${Number(item.total || 0).toLocaleString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="totals">
                        ${(sale.discount || 0) > 0 ? `
                            <div class="row"><span class="muted">${tr('invoice.discount', 'Discount')}</span><span class="muted">-${Number(sale.discount).toLocaleString()}</span></div>
                        ` : ''}
                        <div class="row grand"><span>${tr('invoice.total', 'TOTAL')}</span><span>${Number(sale.totalAmount || 0).toLocaleString()} FCFA</span></div>
                        <div class="row"><span class="muted">${tr('invoice.paid', 'Paid')}</span><span>${Number(sale.paidAmount || 0).toLocaleString()}</span></div>
                        ${(Number(sale.totalAmount || 0) - Number(sale.paidAmount || 0)) > 0 ? `
                            <div class="row"><span class="muted">${tr('invoice.remaining', 'Remaining')}</span><span>${(Number(sale.totalAmount || 0) - Number(sale.paidAmount || 0)).toLocaleString()}</span></div>
                        ` : ''}
                    </div>

                    <div class="footer">
                        ${branding?.footer ? `<p>${branding.footer}</p>` : `<p>${tr('invoice.thank_you', 'Thank you for your business!')}</p>`}
                       
                    </div>
                </div>

                <script>
                    window.onload = function() { window.print(); window.close(); }
                </script>
            </body>
            </html>
        `;

        win.document.write(html);
        win.document.close();
    },

    printSupplyOrder: (order: any, storeName: string = "STORE MANAGEMENT") => {
        const win = window.open('', '', 'width=800,height=800');
        if (!win) return;

        const date = new Date(order.createdAt).toLocaleDateString();

        const html = `
            <html>
            <head>
                <title>PURCHASE ORDER #${order.id.slice(0, 8)}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                    .title { font-size: 24px; font-weight: bold; color: #111; }
                    .meta { margin-top: 10px; font-size: 14px; color: #666; }
                    .section-title { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
                    table { w-full; border-collapse: collapse; width: 100%; margin-bottom: 30px; }
                    th { text-align: left; padding: 10px; border-bottom: 2px solid #eee; font-size: 12px; text-transform: uppercase; color: #666; }
                    td { padding: 12px 10px; border-bottom: 1px solid #eee; font-size: 14px; }
                    .totals { display: flex; justify-content: flex-end; }
                    .total-box { w-64; background: #f9f9f9; padding: 20px; border-radius: 5px; }
                    .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                    .grand-total { font-weight: bold; font-size: 18px; margin-top: 10px; border-top: 1px solid #ddd; padding-top: 10px; }
                    .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #999; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="title">PURCHASE ORDER</div>
                        <div class="meta">PO #${order.id.slice(0, 8).toUpperCase()}</div>
                    </div>
                    <div style="text-align: right">
                        <div class="title">${storeName}</div>
                        <div class="meta">Date: ${date}</div>
                        <div class="meta">Status: <span style="font-weight: bold">${order.status}</span></div>
                    </div>
                </div>

                <div class="info-grid">
                    <div>
                        <div class="section-title">Vendor</div>
                        <div style="font-weight: bold; font-size: 16px">${order.supplier.name}</div>
                        <div>${order.supplier.email || ''}</div>
                        <div>${order.supplier.phone || ''}</div>
                    </div>
                    <div>
                         <div class="section-title">Notes</div>
                         <div style="font-style: italic">${order.notes || 'No notes provided.'}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Item / Description</th>
                            <th style="text-align: center">Qty</th>
                            <th style="text-align: right">Unit Cost</th>
                            <th style="text-align: right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map((item: any) => `
                            <tr>
                                <td>
                                    <div style="font-weight: bold">${item.product.name}</div>
                                    <div style="font-size: 12px; color: #666">${item.product.sku || ''}</div>
                                </td>
                                <td style="text-align: center">${item.quantity}</td>
                                <td style="text-align: right">${Number(item.unitCost).toLocaleString()}</td>
                                <td style="text-align: right">${(item.quantity * item.unitCost).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="totals">
                    <div class="total-box">
                        <div class="total-row grand-total">
                            <span>TOTAL</span>
                            <span>${Number(order.totalAmount).toLocaleString()} FCFA</span>
                        </div>
                    </div>
                </div>

                <div class="footer">
                    Authorized Signature __________________________
                </div>

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        win.document.write(html);
        win.document.close();
    }
};
