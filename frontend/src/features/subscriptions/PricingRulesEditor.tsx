
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';

interface PricingCondition {
    offerPrice?: {
        gte?: number;
        lte?: number;
        gt?: number;
        lt?: number;
        eq?: number;
    };
    offerId?: string | string[];
    storeId?: string | string[];
    duration?: {
        gte?: number;
        lte?: number;
    };
}

interface PricingRule {
    condition: PricingCondition;
    price: number;
    priority: number;
}

interface PricingRulesEditorProps {
    rules: PricingRule[];
    onChange: (rules: PricingRule[]) => void;
}

export function PricingRulesEditor({ rules, onChange }: PricingRulesEditorProps) {
    const { t } = useTranslation();
    const addRule = () => {
        onChange([
            ...rules,
            {
                price: 0,
                priority: 0,
                condition: {}
            }
        ]);
    };

    const removeRule = (index: number) => {
        const newRules = [...rules];
        newRules.splice(index, 1);
        onChange(newRules);
    };

    const updateRule = (index: number, field: keyof PricingRule, value: any) => {
        const newRules = [...rules];
        newRules[index] = { ...newRules[index], [field]: value };
        onChange(newRules);
    };

    const updateCondition = (index: number, field: keyof PricingCondition, value: any) => {
        const newRules = [...rules];
        const currentCondition = newRules[index].condition || {};

        // If value is empty/null, remove the key to keep JSON clean
        const newCondition = { ...currentCondition };
        if (value === undefined || value === null || (typeof value === 'object' && Object.keys(value).length === 0)) {
            delete (newCondition as any)[field];
        } else {
            (newCondition as any)[field] = value;
        }

        newRules[index] = { ...newRules[index], condition: newCondition };
        onChange(newRules);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('pricing_rules.title')}</label>
                <button
                    type="button"
                    onClick={addRule}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                    <Plus className="w-4 h-4 mr-1" /> {t('pricing_rules.add_rule')}
                </button>
            </div>

            {rules.length === 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400 italic border border-dashed border-gray-300 dark:border-gray-600 rounded p-4 text-center">
                    {t('pricing_rules.no_rules')}
                </div>
            )}

            {rules.map((rule, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50 space-y-3">
                    <div className="flex justify-between items-start">
                        <h5 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">{t('pricing_rules.rule_n', { n: index + 1 })}</h5>
                        <button
                            type="button"
                            onClick={() => removeRule(index)}
                            className="text-red-500 hover:text-red-700"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('pricing_rules.override_price')}</label>
                            <input
                                type="number"
                                value={rule.price}
                                onChange={(e) => updateRule(index, 'price', parseFloat(e.target.value))}
                                className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-1.5 text-sm dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('pricing_rules.priority')}</label>
                            <input
                                type="number"
                                value={rule.priority}
                                onChange={(e) => updateRule(index, 'priority', parseInt(e.target.value))}
                                className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-1.5 text-sm dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Conditions Section */}
                    <div className="bg-white dark:bg-gray-900/50 p-2 rounded border border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">{t('pricing_rules.conditions')}</p>

                        {/* Duration Condition */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <div>
                                <label className="block text-[10px] text-gray-500 dark:text-gray-400">{t('pricing_rules.min_duration')}</label>
                                <input
                                    type="number"
                                    placeholder={t('pricing_rules.any')}
                                    value={rule.condition.duration?.gte ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value ? parseInt(e.target.value) : undefined;
                                        const currentDuration = rule.condition.duration || {};
                                        updateCondition(index, 'duration', { ...currentDuration, gte: val });
                                    }}
                                    className="block w-full border border-gray-200 dark:border-gray-600 rounded p-1 text-xs dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-500 dark:text-gray-400">{t('pricing_rules.max_duration')}</label>
                                <input
                                    type="number"
                                    placeholder={t('pricing_rules.any')}
                                    value={rule.condition.duration?.lte ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value ? parseInt(e.target.value) : undefined;
                                        const currentDuration = rule.condition.duration || {};
                                        updateCondition(index, 'duration', { ...currentDuration, lte: val });
                                    }}
                                    className="block w-full border border-gray-200 dark:border-gray-600 rounded p-1 text-xs dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Offer Price Condition */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <div>
                                <label className="block text-[10px] text-gray-500 dark:text-gray-400">{t('pricing_rules.min_price')}</label>
                                <input
                                    type="number"
                                    placeholder={t('pricing_rules.any')}
                                    value={rule.condition.offerPrice?.gte ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                        const currentOfferPrice = rule.condition.offerPrice || {};
                                        updateCondition(index, 'offerPrice', { ...currentOfferPrice, gte: val });
                                    }}
                                    className="block w-full border border-gray-200 dark:border-gray-600 rounded p-1 text-xs dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-500 dark:text-gray-400">{t('pricing_rules.max_price')}</label>
                                <input
                                    type="number"
                                    placeholder={t('pricing_rules.any')}
                                    value={rule.condition.offerPrice?.lte ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                        const currentOfferPrice = rule.condition.offerPrice || {};
                                        updateCondition(index, 'offerPrice', { ...currentOfferPrice, lte: val });
                                    }}
                                    className="block w-full border border-gray-200 dark:border-gray-600 rounded p-1 text-xs dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Store ID Condition - simplified as text input for now, could be multiselect */}
                        <div>
                            <label className="block text-[10px] text-gray-500 dark:text-gray-400">{t('pricing_rules.store_id')}</label>
                            <input
                                type="text"
                                placeholder={t('pricing_rules.store_placeholder')}
                                value={(rule.condition.storeId as string) || ''}
                                onChange={(e) => updateCondition(index, 'storeId', e.target.value || undefined)}
                                className="block w-full border border-gray-200 dark:border-gray-600 rounded p-1 text-xs dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
