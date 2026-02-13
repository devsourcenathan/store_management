import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/services/api';
import { useAuth } from '@/features/auth/useAuth';
import { Search, Filter, Download, Eye, AlertCircle, X } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/Sheet";

interface AuditLog {
    id: string;
    userId: string;
    action: string;
    entity: string;
    entityId: string;
    method?: string;
    status: string;
    duration?: number;
    ipAddress?: string;
    userAgent?: string;
    changes: any;
    createdAt: string;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
    };
}

export function AuditLogsPage() {
    const { user } = useAuth();

    // Filters
    const [userId, setUserId] = useState('');
    const [entity, setEntity] = useState('');
    const [action, setAction] = useState('');
    const [status, setStatus] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination
    const [page, setPage] = useState(0);
    const limit = 50;

    // Details sheet
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Fetch logs
    const { data: logsData, isLoading } = useQuery({
        queryKey: ['audit-logs', userId, entity, action, status, startDate, endDate, page],
        queryFn: async () => {
            const params: any = {
                limit,
                offset: page * limit,
            };

            if (userId) params.userId = userId;
            if (entity) params.entity = entity;
            if (action) params.action = action;
            if (status) params.status = status;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            return await auditApi.getLogs(params);
        },
        enabled: user?.role === 'OWNER' || user?.role === 'MANAGER',
    });

    // Fetch stats
    const { data: stats } = useQuery({
        queryKey: ['audit-stats', startDate, endDate],
        queryFn: async () => {
            const params: any = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            return await auditApi.getStats(params);
        },
        enabled: user?.role === 'OWNER' || user?.role === 'MANAGER',
    });

    const logs = logsData?.logs || [];
    const total = logsData?.total || 0;
    const hasMore = logsData?.hasMore || false;

    // Filter logs by search term (client-side)
    const filteredLogs = logs.filter((log: AuditLog) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            log.action.toLowerCase().includes(term) ||
            log.entity.toLowerCase().includes(term) ||
            log.entityId.toLowerCase().includes(term) ||
            log.user?.email.toLowerCase().includes(term) ||
            log.user?.firstName.toLowerCase().includes(term) ||
            log.user?.lastName.toLowerCase().includes(term)
        );
    });

    const handleViewDetails = (log: AuditLog) => {
        setSelectedLog(log);
        setIsDetailsOpen(true);
    };

    const handleExport = async () => {
        const params: any = {};
        if (userId) params.userId = userId;
        if (entity) params.entity = entity;
        if (action) params.action = action;
        if (status) params.status = status;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const blob = await auditApi.exportLogs(params);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    const clearFilters = () => {
        setUserId('');
        setEntity('');
        setAction('');
        setStatus('');
        setStartDate('');
        setEndDate('');
        setSearchTerm('');
        setPage(0);
    };

    if (user?.role !== 'OWNER' && user?.role !== 'MANAGER') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Access Denied
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        This page is only accessible to owners and managers.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Audit Logs
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                        Track all system operations and user activities
                    </p>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Logs</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalLogs || 0}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {stats.successRate ? `${stats.successRate.toFixed(1)}%` : '0%'}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Avg Duration</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {stats.averageDuration ? `${stats.averageDuration.toFixed(0)}ms` : '-'}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Active Users</p>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {stats.topUsers?.length || 0}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Filters
                    </h3>
                    <button
                        onClick={clearFilters}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                        <X className="w-4 h-4" />
                        Clear All
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="md:col-span-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by user, action, entity..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Entity */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Entity
                        </label>
                        <select
                            value={entity}
                            onChange={(e) => setEntity(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">All Entities</option>
                            <option value="Sale">Sale</option>
                            <option value="Product">Product</option>
                            <option value="Customer">Customer</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Subscription">Subscription</option>
                            <option value="User">User</option>
                            <option value="Store">Store</option>
                        </select>
                    </div>

                    {/* Action */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Action
                        </label>
                        <select
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">All Actions</option>
                            <option value="CREATE">Create</option>
                            <option value="UPDATE">Update</option>
                            <option value="DELETE">Delete</option>
                            <option value="LOGIN">Login</option>
                            <option value="LOGOUT">Logout</option>
                        </select>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Status
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">All Status</option>
                            <option value="SUCCESS">Success</option>
                            <option value="FAILED">Failed</option>
                            <option value="PARTIAL">Partial</option>
                        </select>
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            End Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={handleExport}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-gray-700">
                {/* Mobile Card View */}
                <div className="md:hidden p-4 space-y-4">
                    {isLoading ? (
                        <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">Loading...</div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">No logs found.</div>
                    ) : (
                        filteredLogs.map((log: AuditLog) => (
                            <div
                                key={log.id}
                                className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {log.action} - {log.entity}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {log.user?.firstName} {log.user?.lastName}
                                        </p>
                                    </div>
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${log.status === 'SUCCESS'
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                                : log.status === 'FAILED'
                                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                                            }`}
                                    >
                                        {log.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t-2 border-gray-200 dark:border-gray-700">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-end justify-end">
                                        <button
                                            onClick={() => handleViewDetails(log)}
                                            className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Date/Time
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Action
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Entity
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Method
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Duration
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-4 text-center dark:text-gray-400">
                                        Loading...
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        No logs found.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log: AuditLog) => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                            <div>
                                                <div>{log.user?.firstName} {log.user?.lastName}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{log.user?.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {log.action}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            <div>
                                                <div>{log.entity}</div>
                                                <div className="text-xs text-gray-400">{log.entityId.substring(0, 8)}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {log.method || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium ${log.status === 'SUCCESS'
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                                        : log.status === 'FAILED'
                                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                                                    }`}
                                            >
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {log.duration ? `${log.duration}ms` : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleViewDetails(log)}
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                        Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} results
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(Math.max(0, page - 1))}
                            disabled={page === 0}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(page + 1)}
                            disabled={!hasMore}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Details Sheet */}
            <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto w-full">
                    {selectedLog && (
                        <>
                            <SheetHeader className="mb-6">
                                <SheetTitle className="flex justify-between items-center">
                                    <span>Audit Log Details</span>
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${selectedLog.status === 'SUCCESS'
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                                : selectedLog.status === 'FAILED'
                                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                                            }`}
                                    >
                                        {selectedLog.status}
                                    </span>
                                </SheetTitle>
                                <SheetDescription>
                                    {new Date(selectedLog.createdAt).toLocaleString()}
                                </SheetDescription>
                            </SheetHeader>

                            <div className="space-y-6">
                                {/* User Info */}
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">User Information</h4>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Name:</span>
                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {selectedLog.user?.firstName} {selectedLog.user?.lastName}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Email:</span>
                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {selectedLog.user?.email}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Role:</span>
                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {selectedLog.user?.role}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Operation Info */}
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Operation Details</h4>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Action:</span>
                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {selectedLog.action}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Entity:</span>
                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {selectedLog.entity}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Entity ID:</span>
                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 font-mono">
                                                {selectedLog.entityId}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Method:</span>
                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {selectedLog.method || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">Duration:</span>
                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {selectedLog.duration ? `${selectedLog.duration}ms` : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">IP Address:</span>
                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 font-mono">
                                                {selectedLog.ipAddress || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Changes */}
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Changes</h4>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                                        <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
                                            {JSON.stringify(selectedLog.changes, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
