import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, User, Minus, Plus, Trash2 } from 'lucide-react';

export interface CartItem {
    productId: string;
    name: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    discount: number;
}

interface PosCartProps {
    cart: CartItem[];
    totalItems: number;
    itemsTotal: number;
    cartTotal: number;
    globalDiscount: number;
    isSyncing: boolean;
    pendingOperations: number;
    selectedCustomerId: string;
    customers: any[];
    onCustomerSelect: (customerId: string) => void;
    onUpdateDiscount: (productId: string, discount: number) => void;
    onUpdateQuantity: (productId: string, delta: number) => void;
    onRemoveFromCart: (productId: string) => void;
    onSetGlobalDiscount: (discount: number) => void;
    onCheckout: () => void;
}

export const PosCart: React.FC<PosCartProps> = ({
    cart,
    totalItems,
    itemsTotal,
    cartTotal,
    globalDiscount,
    isSyncing,
    pendingOperations,
    selectedCustomerId,
    customers,
    onCustomerSelect,
    onUpdateDiscount,
    onUpdateQuantity,
    onRemoveFromCart,
    onSetGlobalDiscount,
    onCheckout,
}) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-3">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        {t('pos.current_sale')}
                    </h2>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{totalItems} {t('pos.items')}</span>
                        {/* Sync Status Indicator */}
                        {pendingOperations > 0 && (
                            <span className="text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-full flex items-center gap-1">
                                {isSyncing ? '🔄' : '⏳'} {pendingOperations}
                            </span>
                        )}
                    </div>
                </div>

                {/* Customer Selection */}
                <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                        className="w-full pl-9 pr-4 py-2 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 appearance-none bg-white dark:bg-gray-700"
                        value={selectedCustomerId}
                        onChange={(e) => onCustomerSelect(e.target.value)}
                    >
                        <option value="">{t('pos.walk_in_customer')}</option>
                        {customers?.map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                {cart.map(item => (
                    <div key={item.productId} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                        <div className="flex-1 min-w-0 mr-3">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {item.unitPrice.toLocaleString()} F x {item.quantity}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">{t('pos.discount', 'Discount')}:</span>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-16 h-6 text-xs border border-gray-200 dark:border-gray-600 rounded px-1 dark:bg-gray-800 dark:text-gray-200"
                                    value={item.discount}
                                    onChange={(e) => onUpdateDiscount(item.productId, parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg h-8">
                                <button
                                    onClick={() => onUpdateQuantity(item.productId, -1)}
                                    className="w-8 h-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600"
                                >
                                    <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-gray-100">{item.quantity}</span>
                                <button
                                    onClick={() => onUpdateQuantity(item.productId, 1)}
                                    className="w-8 h-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 border-l border-gray-200 dark:border-gray-600"
                                >
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>
                            <button
                                onClick={() => onRemoveFromCart(item.productId)}
                                className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
                {cart.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 opacity-50 space-y-4">
                        <ShoppingCart className="w-16 h-16" />
                        <p>{t('pos.cart_empty')}</p>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-4">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t('pos.subtotal')}</span>
                    <span className="text-gray-900 dark:text-gray-100">{itemsTotal.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between items-center text-sm gap-4">
                    <span className="text-gray-600 dark:text-gray-400">{t('pos.global_discount', 'Global Discount')}</span>
                    <input
                        type="number"
                        min="0"
                        className="w-24 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-right dark:bg-gray-700 dark:text-white"
                        value={globalDiscount}
                        onChange={(e) => onSetGlobalDiscount(parseInt(e.target.value) || 0)}
                    />
                </div>
                <div className="flex justify-between items-center text-lg font-bold text-gray-900 dark:text-gray-100 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span>{t('pos.total')}</span>
                    <span>{cartTotal.toLocaleString()} FCFA</span>
                </div>
                <button
                    onClick={onCheckout}
                    disabled={cart.length === 0}
                    className="w-full py-3 btn-theme-primary rounded-xl font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                    {t('pos.proceed_payment')}
                </button>
            </div>
        </div>
    );
};
