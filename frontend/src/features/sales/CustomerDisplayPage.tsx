import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOrganization } from '@/contexts/OrganizationContext';
import { motion, AnimatePresence } from 'framer-motion';

interface CartItem {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    originalPrice?: number;
    image?: string;
    hasSerialNumber?: boolean;
    serialNumbers?: string[];
}

interface PosSyncMessage {
    type: string;
    payload: {
        cart: CartItem[];
        total: number;
        status: string;
    };
}

export function CustomerDisplayPage() {
    const { t } = useTranslation();
    const { organization } = useOrganization();

    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartTotal, setCartTotal] = useState<number>(0);
    const [status, setStatus] = useState<string>('PENDING');

    useEffect(() => {
        const channel = new BroadcastChannel('pos_channel');

        channel.onmessage = (event: MessageEvent<PosSyncMessage>) => {
            if (event.data?.type === 'SYNC_CART') {
                setCart(event.data.payload.cart || []);
                setCartTotal(event.data.payload.total || 0);
                setStatus(event.data.payload.status || 'PENDING');
            }
        };

        // Also ask for an initial sync just in case the page loaded after the POS was already open
        channel.postMessage({ type: 'REQUEST_SYNC' });

        return () => {
            channel.close();
        };
    }, []);

    // Empty state: show organization info
    if (cart.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-8 overflow-hidden relative">
                {/* Background decorative elements */}
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="z-10 flex flex-col items-center"
                >
                    {organization?.logoUrl ? (
                        <motion.img
                            src={organization.logoUrl}
                            alt={organization?.name || 'Company Logo'}
                            className="h-56 w-auto mb-10 object-contain drop-shadow-2xl"
                            animate={{ y: [0, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        />
                    ) : (
                        <motion.div
                            className="h-56 w-56 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center mb-10 shadow-2xl shadow-primary/30"
                            animate={{ y: [0, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        >
                            <span className="text-8xl text-white font-black tracking-tighter">
                                {organization?.name?.charAt(0).toUpperCase() || 'S'}
                            </span>
                        </motion.div>
                    )}
                    <h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white mb-6 text-center tracking-tight">
                        {t('pos.customer_welcome', { defaultValue: 'Bienvenue chez {{name}}', name: organization?.name || 'nous' })}
                    </h1>
                    <p className="text-2xl text-gray-500 dark:text-gray-400 font-medium">
                        {t('pos.customer_wait', { defaultValue: 'Préparez vos articles, nous sommes à vous.' })}
                    </p>
                </motion.div>
            </div>
        );
    }

    // Paid state: show a thank you message
    if (status === 'PAID') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-green-900/30 flex flex-col items-center justify-center p-8 overflow-hidden relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-400/20 rounded-full blur-[100px]" />

                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
                    className="z-10 flex flex-col items-center"
                >
                    <div className="h-40 w-40 bg-gradient-to-tr from-green-500 to-emerald-400 rounded-full flex items-center justify-center mb-10 shadow-2xl shadow-green-500/40 border-4 border-white/50 dark:border-gray-800/50">
                        <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-6xl font-black text-gray-900 dark:text-white mb-6 text-center tracking-tight">
                        {t('pos.payment_success', { defaultValue: 'Paiement Réussi !' })}
                    </h1>
                    <p className="text-3xl text-gray-600 dark:text-gray-300 font-medium">
                        {t('pos.thank_you', { defaultValue: 'Merci de votre visite et à très bientôt.' })}
                    </p>
                </motion.div>
            </div>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    // Active cart state
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex font-sans overflow-hidden">
            {/* Left side: Cart items */}
            <div className="flex-1 p-8 md:p-12 flex flex-col bg-white dark:bg-gray-800/50 shadow-2xl z-10">
                <div className="flex items-center justify-between mb-10 border-b-2 dark:border-gray-700/50 pb-6">
                    <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                        {t('pos.your_cart', { defaultValue: 'Votre Panier' })}
                    </h2>
                    {organization?.logoUrl ? (
                        <img src={organization.logoUrl} alt="Logo" className="h-14 w-auto object-contain" />
                    ) : (
                        <span className="text-2xl font-bold text-gray-400">{organization?.name}</span>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto pr-4 -mr-4 space-y-4">
                    <AnimatePresence mode="popLayout">
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            className="space-y-4"
                        >
                            {cart.map((item, index) => {
                                const itemTotal = (item.quantity * item.unitPrice) - item.discount;
                                return (
                                    <motion.div
                                        key={`${item.id}-${item.id}-${index}`}
                                        variants={itemVariants}
                                        layout
                                        className="flex items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-center space-x-6">
                                            <div className="flex flex-col items-center justify-center h-16 w-16 bg-gradient-to-br from-primary/10 to-primary/20 text-primary rounded-xl font-black text-2xl border border-primary/10">
                                                {item.quantity}x
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{item.name}</h3>
                                                <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">
                                                    {item.unitPrice.toLocaleString()} FCFA / u
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-3xl font-black text-gray-900 dark:text-white">
                                                {itemTotal.toLocaleString()} FCFA
                                            </span>
                                            {item.discount > 0 && (
                                                <p className="text-md text-green-500 font-bold mt-1 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full inline-block">
                                                    -{item.discount.toLocaleString()} FCFA
                                                </p>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Right side: Total & Payment Info (Glassmorphism) */}
            <div className="w-[450px] bg-gradient-to-b from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-950 p-8 flex flex-col justify-center relative overflow-hidden">
                {/* Decorative blobs */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px]" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]" />

                <motion.div
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
                    className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-white/50 dark:border-gray-700/50 rounded-[2rem] p-10 shadow-2xl z-10 flex flex-col items-center"
                >
                    <h3 className="text-xl font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mb-8">
                        {t('pos.total_to_pay', { defaultValue: 'Total à payer' })}
                    </h3>

                    <div className="text-center w-full bg-gradient-to-br from-primary to-blue-600 bg-clip-text text-transparent mb-10">
                        <span className="text-7xl font-black tracking-tighter">
                            {cartTotal.toLocaleString()}
                        </span>
                        <span className="text-3xl font-bold text-gray-400 dark:text-gray-500 block mt-2">
                            FCFA
                        </span>
                    </div>

                    <div className="w-full pt-8 border-t-2 border-gray-200/50 dark:border-gray-700/50">
                        <div className="flex justify-between items-center text-2xl text-gray-600 dark:text-gray-300">
                            <span className="font-medium">{t('pos.items_count', { defaultValue: 'Articles' })}</span>
                            <span className="font-black bg-gray-100 dark:bg-gray-700 px-4 py-1 rounded-full">
                                {cart.reduce((acc, item) => acc + item.quantity, 0)}
                            </span>
                        </div>
                    </div>
                </motion.div>

                <div className="mt-auto pt-10 text-center z-10">
                    <p className="text-xl font-bold text-gray-400 dark:text-gray-600 tracking-wide">
                        {organization?.name || 'Stock Management'}
                    </p>
                </div>
            </div>
        </div>
    );
}
