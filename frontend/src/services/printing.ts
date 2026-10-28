export const printer = {
    printInvoice: (sale: any, storeName: string = "STORE MANAGEMENT", t: (key: string) => string = (key) => key) => {
        const win = window.open('', '', 'width=800,height=600');
        if (!win) return;

        const date = new Date(sale.createdAt).toLocaleDateString();
        const time = new Date(sale.createdAt).toLocaleTimeString();

        // Helper to get translated string with fallback
        const tr = (key: string, defaultText: string) => {
            const translated = t(key);
            return translated === key ? defaultText : translated;
        };

        const html = `
            <html>
            <head>
                <title>${tr('invoice.title', 'INVOICE')} #${sale.id.slice(0, 8)}</title>
                <style>
                    * {
                        box-sizing: border-box;
                        color: #000 !important;
                        font-weight: 700 !important;
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        font-weight: 700;
                        font-size: 13px;
                        line-height: 1.4;
                        color: #000;
                        padding: 15px;
                        max-width: 380px;
                        margin: 0 auto;
                        -webkit-font-smoothing: antialiased;
                        -moz-osx-font-smoothing: grayscale;
                        text-rendering: optimizeLegibility;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 14px;
                        border-bottom: 2px dashed #000;
                        padding-bottom: 10px;
                    }
                    .store-name {
                        font-size: 19px;
                        font-weight: 900 !important;
                        text-transform: uppercase;
                        margin-bottom: 6px;
                        letter-spacing: 0.5px;
                    }
                    .meta {
                        font-size: 13px;
                        font-weight: 700 !important;
                        margin-bottom: 4px;
                    }
                    .divider {
                        border-top: 2px dashed #000;
                        margin: 10px 0;
                    }
                    .items {
                        margin-bottom: 12px;
                    }
                    .item {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        font-size: 13px;
                        font-weight: 700 !important;
                        margin-bottom: 6px;
                        gap: 8px;
                    }
                    .item-desc {
                        flex: 1;
                        word-break: break-word;
                    }
                    .item-total {
                        white-space: nowrap;
                        text-align: right;
                    }
                    .totals {
                        margin-top: 12px;
                        border-top: 2px dashed #000;
                        padding-top: 8px;
                    }
                    .total-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: 16px;
                        font-weight: 900 !important;
                        margin-top: 6px;
                    }
                    .footer {
                        text-align: center;
                        font-size: 12px;
                        font-weight: 700 !important;
                        margin-top: 24px;
                        border-top: 1.5px dashed #000;
                        padding-top: 10px;
                    }
                    .footer p {
                        margin: 4px 0;
                    }
                    @media print {
                        @page {
                            margin: 0;
                            size: auto;
                        }
                        body {
                            padding: 8px;
                            max-width: 100%;
                            width: 100%;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="store-name">${storeName}</div>
                    <div class="meta">${tr('invoice.date', 'Date')}: ${date} ${time}</div>
                    <div class="meta">${tr('invoice.receipt', 'Receipt')}: #${sale.id.slice(0, 8).toUpperCase()}</div>
                    ${sale.customer ? `<div class="meta">${tr('invoice.customer', 'Customer')}: ${sale.customer.name}</div>` : ''}
                </div>

                <div class="items">
                    ${(sale.items || []).map((item: any) => `
                        <div class="item">
                            <span class="item-desc">${item.product?.name || item.name || 'Unknown Item'} x${item.quantity}</span>
                            <span class="item-total">${Number(item.total).toLocaleString()} F</span>
                        </div>
                    `).join('')}
                </div>

                <div class="totals">
                    ${(sale.discount || 0) > 0 ? `
                    <div class="item">
                        <span class="item-desc">${tr('invoice.discount', 'Discount')}</span>
                        <span class="item-total">-${Number(sale.discount).toLocaleString()} F</span>
                    </div>` : ''}
                    <div class="total-row">
                        <span>${tr('invoice.total', 'TOTAL')}</span>
                        <span>${Number(sale.totalAmount).toLocaleString()} FCFA</span>
                    </div>
                    <div class="item" style="margin-top: 6px">
                        <span class="item-desc">${tr('invoice.paid', 'Paid')}</span>
                        <span class="item-total">${Number(sale.paidAmount).toLocaleString()} F</span>
                    </div>
                    ${(sale.totalAmount - sale.paidAmount) > 0 ? `
                    <div class="total-row" style="margin-top: 6px; border-top: 1.5px dotted #000; padding-top: 6px;">
                        <span>${tr('invoice.remaining', 'Remaining')}</span>
                        <span>${Number(sale.totalAmount - sale.paidAmount).toLocaleString()} FCFA</span>
                    </div>` : ''}
                </div>

                <div class="footer">
                    <p>${tr('invoice.thank_you', 'Thank you for your business!')}</p>
                    <p>${tr('invoice.powered_by', 'Powered by StockManagement')}</p>
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
