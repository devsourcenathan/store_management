
interface ProductData {
    name: string;
    totalQuantity: number;
    totalRevenue: number;
}

interface TopProductsProps {
    data: ProductData[];
    isLoading: boolean;
}

export function TopProducts({ data, isLoading }: TopProductsProps) {
    if (isLoading) return <div className="animate-pulse space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-50 rounded-lg"></div>)}</div>;

    if (!data || data.length === 0) return <div className="text-gray-500 text-center py-8">No sales data yet</div>;

    return (
        <div className="space-y-4">
            {data.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-400 dark:text-gray-500 shadow-sm border border-gray-100 dark:border-gray-700">
                            {index + 1}
                        </div>
                        <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{product.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{product.totalQuantity} sold</p>
                        </div>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                        {Number(product.totalRevenue).toLocaleString()} F
                    </span>
                </div>
            ))}
        </div>
    );
}
