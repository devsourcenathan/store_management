export const printer = {
    printInvoice: (
        sale: any,
        store:
            | string
            | {
                name?: string;
                phone?: string;
                email?: string;
                address?: string;
                receiptFooter?: string;
            } = "STORE MANAGEMENT",
        t: (key: string) => string = (key) => key
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

        const escapeHtml = (value: any) => {
            const str = String(value ?? '');
            return str
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#39;');
        };

        const storeInfo =
            typeof store === 'string'
                ? { name: store }
                : {
                    name: store?.name || 'STORE MANAGEMENT',
                    phone: store?.phone,
                    email: store?.email,
                    address: store?.address,
                    receiptFooter: store?.receiptFooter,
                };

        const html = `
            <html>
            <head>
                <title>${tr('invoice.title', 'INVOICE')} #${sale.id.slice(0, 8)}</title>
                <style>
                    body { font-family: 'Courier New', monospace; padding: 20px; max-width: 400px; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                    .store-name { font-size: 18px; font-weight: bold; }
                    .meta { font-size: 12px; margin-bottom: 5px; }
                    .divider { border-top: 1px dashed #000; margin: 10px 0; }
                    .item { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px; }
                    .totals { margin-top: 15px; border-top: 1px dashed #000; pt-2; }
                    .total-row { display: flex; justify-content: space-between; font-weight: bold; margin-top: 5px; }
                    .footer { text-align: center; font-size: 10px; margin-top: 30px; }
                    @media print { @page { margin: 0; } body { padding: 10px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="store-name">${escapeHtml(storeInfo.name)}</div>
                    ${storeInfo.phone ? `<div class="meta">${tr('invoice.phone', 'Phone')}: ${escapeHtml(storeInfo.phone)}</div>` : ''}
                    ${storeInfo.email ? `<div class="meta">${tr('invoice.email', 'Email')}: ${escapeHtml(storeInfo.email)}</div>` : ''}
                    ${storeInfo.address ? `<div class="meta">${tr('invoice.location', 'Location')}: ${escapeHtml(storeInfo.address)}</div>` : ''}
                    <div class="meta">${tr('invoice.date', 'Date')}: ${date} ${time}</div>
                    <div class="meta">${tr('invoice.receipt', 'Receipt')}: #${sale.id.slice(0, 8).toUpperCase()}</div>
                    ${sale.customer ? `<div class="meta">${tr('invoice.customer', 'Customer')}: ${escapeHtml(sale.customer.name)}</div>` : ''}
                </div>

                <div class="items">
                    ${(sale.items || []).map((item: any) => `
                        <div class="item">
                            <span>${escapeHtml(item.product?.name || item.name || 'Unknown Item')} x${escapeHtml(item.quantity)}</span>
                            <span>${Number(item.total).toLocaleString()}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="totals">
                    ${(sale.discount || 0) > 0 ? `
                    <div class="item" style="color: #666;">
                        <span>${tr('invoice.discount', 'Discount')}</span>
                        <span>-${Number(sale.discount).toLocaleString()}</span>
                    </div>` : ''}
                    <div class="total-row">
                        <span>${tr('invoice.total', 'TOTAL')}</span>
                        <span>${Number(sale.totalAmount).toLocaleString()} FCFA</span>
                    </div>
                    <div class="item" style="margin-top: 5px">
                        <span>${tr('invoice.paid', 'Paid')}</span>
                        <span>${Number(sale.paidAmount).toLocaleString()}</span>
                    </div>
                    ${(sale.totalAmount - sale.paidAmount) > 0 ? `
                    <div class="total-row" style="margin-top: 5px; border-top: 1px dotted #000; padding-top: 5px;">
                        <span>${tr('invoice.remaining', 'Remaining')}</span>
                        <span>${Number(sale.totalAmount - sale.paidAmount).toLocaleString()}</span>
                    </div>` : ''}
                </div>

                <div class="footer">
                    ${storeInfo.receiptFooter ? `<p>${escapeHtml(storeInfo.receiptFooter)}</p>` : ''}
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
                                    <div style="font-size: 12px; color: #666">${item.product.sku}</div>
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
