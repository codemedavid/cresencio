"use client";

import { useState, useEffect } from "react";
import {
    BarChart3,
    Users,
    ShoppingBag,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    Filter,
    Package,
    Plus,
    Loader2,
    RefreshCw,
    Eye,
    X,
    CreditCard,
    Settings,
    Mail,
    Save
} from "lucide-react";
import Image from "next/image";
import { getAllOrdersAction, updateOrderStatusAction } from "@/app/actions/orders";
import { getPaymentMethodsAction, deletePaymentMethodAction } from "@/app/actions/paymentMethods";
import { getSettingAction, setSettingAction } from "@/app/actions/settings";
import { SETTING_KEYS } from "@/lib/constants";
import { productService } from "@/lib/productService";
import { userService, AdminUser } from "@/lib/userService";
import { ProductWithVariations, OrderWithDetails, OrderStatus, PaymentMethod } from "@/lib/types/database";
import ProductModal from "@/components/admin/ProductModal";
import PaymentMethodModal from "@/components/admin/PaymentMethodModal";
import { approveVipRequest, rejectVipRequest, approveUser } from "@/app/register/actions";

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<"orders" | "users" | "products" | "payments" | "settings">("orders");
    const [orders, setOrders] = useState<OrderWithDetails[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Product State
    const [products, setProducts] = useState<ProductWithVariations[]>([]);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProductWithVariations | null>(null);

    // Payment Method State
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false);
    const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
    const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Settings State
    const [notificationEmail, setNotificationEmail] = useState('');
    const [loadingSettings, setLoadingSettings] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // ID Preview Modal State
    const [selectedUserForId, setSelectedUserForId] = useState<AdminUser | null>(null);
    const [isIdModalOpen, setIsIdModalOpen] = useState(false);

    const handleViewId = (user: AdminUser) => {
        setSelectedUserForId(user);
        setIsIdModalOpen(true);
    };

    const handleCloseIdModal = () => {
        setSelectedUserForId(null);
        setIsIdModalOpen(false);
    };

    // User Profile Modal State (for viewing user from orders)
    const [selectedUserProfile, setSelectedUserProfile] = useState<OrderWithDetails['user'] | null>(null);
    const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);

    const handleViewUserProfile = (user: OrderWithDetails['user']) => {
        setSelectedUserProfile(user);
        setIsUserProfileModalOpen(true);
    };

    const handleCloseUserProfileModal = () => {
        setSelectedUserProfile(null);
        setIsUserProfileModalOpen(false);
    };

    // Order Details Modal State
    const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
    const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);

    const handleViewOrderDetails = (order: OrderWithDetails) => {
        setSelectedOrder(order);
        setIsOrderDetailsModalOpen(true);
    };

    const handleCloseOrderDetailsModal = () => {
        setSelectedOrder(null);
        setIsOrderDetailsModalOpen(false);
    };

    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchOrders();
        fetchProducts();
        fetchUsers();
        fetchPaymentMethods();
        fetchSettings();
    }, []);

    const fetchOrders = async () => {
        setLoadingOrders(true);
        try {
            const data = await getAllOrdersAction();
            setOrders(data);
        } catch (error) {
            console.error("Failed to fetch orders", error);
        } finally {
            setLoadingOrders(false);
        }
    };

    const fetchProducts = async () => {
        setLoadingProducts(true);
        try {
            const data = await productService.getProducts();
            setProducts(data);
        } catch (error) {
            console.error("Failed to fetch products", error);
        } finally {
            setLoadingProducts(false);
        }
    };

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const data = await userService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            if (activeTab === "orders") {
                await fetchOrders();
            } else if (activeTab === "users") {
                await fetchUsers();
            } else if (activeTab === "products") {
                await fetchProducts();
            } else if (activeTab === "settings") {
                await fetchSettings();
            }
        } finally {
            setRefreshing(false);
        }
    };

    // Settings handlers
    const fetchSettings = async () => {
        setLoadingSettings(true);
        try {
            const result = await getSettingAction(SETTING_KEYS.NOTIFICATION_EMAIL);
            if (result.success) {
                setNotificationEmail(result.value || '');
            }
        } catch (error) {
            console.error('Failed to fetch settings', error);
        } finally {
            setLoadingSettings(false);
        }
    };

    const handleSaveNotificationEmail = async () => {
        setSavingSettings(true);
        setSettingsMessage(null);
        try {
            const result = await setSettingAction(SETTING_KEYS.NOTIFICATION_EMAIL, notificationEmail);
            if (result.success) {
                setSettingsMessage({ type: 'success', text: 'Notification email saved successfully!' });
            } else {
                setSettingsMessage({ type: 'error', text: result.error || 'Failed to save settings' });
            }
        } catch (error) {
            setSettingsMessage({ type: 'error', text: 'An unexpected error occurred' });
        } finally {
            setSavingSettings(false);
        }
    };

    // Helper to determine user approval status
    const getUserApprovalStatus = (user: AdminUser): 'pending' | 'approved' | null => {
        // Check if user is approved
        if (user.is_approved) {
            return 'approved';
        }
        // User is not approved = pending
        return 'pending';
    };

    // Helper to determine if user is a VIP request (has submitted ID proof)
    const isVipRequest = (user: AdminUser): boolean => {
        return user.role === 'vip' || !!user.id_proof_url;
    };

    const handleApproveVip = async (userId: string) => {
        try {
            const result = await approveVipRequest(userId);
            if (result.success) {
                setUsers(users.map(user =>
                    user.id === userId
                        ? { ...user, role: 'vip' as const, is_approved: true }
                        : user
                ));
            } else {
                console.error('Failed to approve VIP:', result.error);
                alert(`Failed to approve VIP: ${result.error}`);
            }
        } catch (error) {
            console.error('Error approving VIP request:', error);
            alert('An unexpected error occurred while approving VIP request.');
        }
    };

    const handleApproveUser = async (userId: string) => {
        try {
            const result = await approveUser(userId);
            if (result.success) {
                setUsers(users.map(user =>
                    user.id === userId
                        ? { ...user, is_approved: true }
                        : user
                ));
            } else {
                console.error('Failed to approve user:', result.error);
                alert(`Failed to approve user: ${result.error}`);
            }
        } catch (error) {
            console.error('Error approving user:', error);
            alert('An unexpected error occurred while approving user.');
        }
    };

    const handleRejectVip = async (userId: string) => {
        try {
            const result = await rejectVipRequest(userId);
            if (result.success) {
                setUsers(users.map(user =>
                    user.id === userId
                        ? { ...user, is_approved: false }
                        : user
                ));
            } else {
                console.error('Failed to reject VIP:', result.error);
                alert(`Failed to reject VIP: ${result.error}`);
            }
        } catch (error) {
            console.error('Error rejecting VIP request:', error);
            alert('An unexpected error occurred while rejecting VIP request.');
        }
    };

    const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
        try {
            const result = await updateOrderStatusAction(orderId, newStatus);
            if (result.success) {
                setOrders(orders.map(order =>
                    order.id === orderId ? { ...order, status: newStatus } : order
                ));
            } else {
                alert(`Failed to update status: ${result.error}`);
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            alert('Failed to update order status');
        }
    };

    const handleEditProduct = (product: ProductWithVariations) => {
        setEditingProduct(product);
        setIsProductModalOpen(true);
    };

    const handleAddProduct = () => {
        setEditingProduct(null);
        setIsProductModalOpen(true);
    };

    const handleDeleteProduct = async (id: string) => {
        if (confirm("Are you sure you want to delete this product?")) {
            await productService.deleteProduct(id);
            fetchProducts();
        }
    };

    const handleSaveProduct = () => {
        fetchProducts();
    };

    // Payment Method handlers
    const fetchPaymentMethods = async () => {
        setLoadingPaymentMethods(true);
        try {
            const data = await getPaymentMethodsAction();
            setPaymentMethods(data);
        } catch (error) {
            console.error("Failed to fetch payment methods", error);
        } finally {
            setLoadingPaymentMethods(false);
        }
    };

    const handleAddPaymentMethod = () => {
        setEditingPaymentMethod(null);
        setIsPaymentMethodModalOpen(true);
    };

    const handleEditPaymentMethod = (pm: PaymentMethod) => {
        setEditingPaymentMethod(pm);
        setIsPaymentMethodModalOpen(true);
    };

    const handleDeletePaymentMethod = async (id: string) => {
        if (confirm("Are you sure you want to delete this payment method?")) {
            await deletePaymentMethodAction(id);
            fetchPaymentMethods();
        }
    };

    const handleSavePaymentMethod = () => {
        fetchPaymentMethods();
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Admin Dashboard</h1>
                        <p className="mt-1 text-sm text-gray-500">Manage orders, users, and products.</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex space-x-3">
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                        <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            <Filter className="mr-2 h-4 w-4" />
                            Filter
                        </button>
                        {activeTab === "products" && (
                            <button
                                onClick={handleAddProduct}
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Product
                            </button>
                        )}
                        {activeTab === "payments" && (
                            <button
                                onClick={handleAddPaymentMethod}
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Payment Method
                            </button>
                        )}
                        {activeTab !== "products" && activeTab !== "payments" && (
                            <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                                <ShoppingBag className="mr-2 h-4 w-4" />
                                Export Data
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-10">
                    <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <ShoppingBag className="h-6 w-6 text-indigo-600" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                                        <dd>
                                            <div className="text-lg font-medium text-gray-900">{orders.length}</div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <Users className="h-6 w-6 text-green-600" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                                        <dd>
                                            <div className="text-lg font-medium text-gray-900">{users.length}</div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <Package className="h-6 w-6 text-orange-500" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Total Products</dt>
                                        <dd>
                                            <div className="text-lg font-medium text-gray-900">{products.length}</div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <BarChart3 className="h-6 w-6 text-blue-500" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Revenue</dt>
                                        <dd>
                                            <div className="text-lg font-medium text-gray-900">
                                                ₱{orders.reduce((acc, curr) => acc + (curr.total_amount || 0), 0).toFixed(2)}
                                            </div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab("orders")}
                            className={`${activeTab === "orders"
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
                        >
                            <ShoppingBag className="mr-2 h-4 w-4" />
                            Orders
                        </button>
                        <button
                            onClick={() => setActiveTab("users")}
                            className={`${activeTab === "users"
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
                        >
                            <Users className="mr-2 h-4 w-4" />
                            Users & VIP Requests
                        </button>
                        <button
                            onClick={() => setActiveTab("products")}
                            className={`${activeTab === "products"
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
                        >
                            <Package className="mr-2 h-4 w-4" />
                            Products
                        </button>
                        <button
                            onClick={() => setActiveTab("payments")}
                            className={`${activeTab === "payments"
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
                        >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Payment Methods
                        </button>
                        <button
                            onClick={() => setActiveTab("settings")}
                            className={`${activeTab === "settings"
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
                        >
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </button>
                    </nav>
                </div>

                {/* Content */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                    {activeTab === "orders" && (
                        <div className="overflow-x-auto">
                            {loadingOrders ? (
                                <div className="p-8 text-center text-gray-500 flex justify-center items-center">
                                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                    Loading orders...
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Order ID
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Customer
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Product
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Total
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {orders.map((order) => (
                                            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {order.id.slice(0, 8)}...
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    {order.user ? (
                                                        <button
                                                            onClick={() => handleViewUserProfile(order.user)}
                                                            className="text-indigo-600 hover:text-indigo-900 hover:underline font-medium"
                                                        >
                                                            {order.user.full_name || order.user.email || 'Unknown User'}
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-500">Unknown User</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {order.product?.name || 'Custom Request'}
                                                    {order.reference_file_urls && order.reference_file_urls.length > 0 && (
                                                        <span className="block text-xs text-indigo-600 mt-1">
                                                            {order.reference_file_urls.length} file(s) attached
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(order.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                    {order.total_amount ? `₱${order.total_amount.toFixed(2)}` : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <select
                                                        value={order.status}
                                                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as OrderStatus)}
                                                        className={`block w-full pl-3 pr-10 py-1 text-xs font-semibold rounded-full border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm
                                                        ${order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                                                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                                        'bg-yellow-100 text-yellow-800'}`}
                                                    >
                                                        <option value="pending">Pending</option>
                                                        <option value="processing">Processing</option>
                                                        <option value="completed">Completed</option>
                                                        <option value="cancelled">Cancelled</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => handleViewOrderDetails(order)}
                                                        className="inline-flex items-center text-indigo-600 hover:text-indigo-900 border border-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-md transition-colors"
                                                    >
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            {orders.length === 0 && !loadingOrders && (
                                <div className="text-center py-10 text-gray-500">
                                    No orders found.
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "users" && (
                        <div className="overflow-x-auto">
                            {loadingUsers ? (
                                <div className="text-center py-10 text-gray-500">
                                    Loading users...
                                </div>
                            ) : (
                                <>
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    User
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Role
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Joined Date
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    VIP Status
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {users.map((user) => {
                                                const approvalStatus = getUserApprovalStatus(user);
                                                const vipRequest = isVipRequest(user);
                                                const displayName = user.full_name || user.email.split('@')[0];
                                                return (
                                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                                                                    {displayName.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="ml-4">
                                                                    <div className="text-sm font-medium text-gray-900">{displayName}</div>
                                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${user.role === 'vip' ? 'bg-purple-100 text-purple-800' :
                                                                    user.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                                {user.role.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {new Date(user.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${approvalStatus === 'approved' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                                                {approvalStatus === 'approved' ? 'Approved' : 'Pending'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            {approvalStatus === 'pending' && (
                                                                <div className="flex justify-end space-x-2">
                                                                    {user.id_proof_url && (
                                                                        <button
                                                                            onClick={() => handleViewId(user)}
                                                                            className="text-blue-600 hover:text-blue-900 border border-blue-600 hover:bg-blue-50 px-3 py-1 rounded-md transition-colors flex items-center"
                                                                        >
                                                                            <Eye className="h-4 w-4 mr-1" /> View ID
                                                                        </button>
                                                                    )}
                                                                    {vipRequest ? (
                                                                        /* VIP approval - sets role to vip and approves */
                                                                        <>
                                                                            <button
                                                                                onClick={() => handleApproveVip(user.id)}
                                                                                className="text-green-600 hover:text-green-900 border border-green-600 hover:bg-green-50 px-3 py-1 rounded-md transition-colors"
                                                                            >
                                                                                Approve VIP
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleRejectVip(user.id)}
                                                                                className="text-red-600 hover:text-red-900 border border-red-600 hover:bg-red-50 px-3 py-1 rounded-md transition-colors"
                                                                            >
                                                                                Reject
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        /* Regular user approval - just sets is_approved to true */
                                                                        <button
                                                                            onClick={() => handleApproveUser(user.id)}
                                                                            className="text-green-600 hover:text-green-900 border border-green-600 hover:bg-green-50 px-3 py-1 rounded-md transition-colors"
                                                                        >
                                                                            Approve
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {users.length === 0 && (
                                        <div className="text-center py-10 text-gray-500">
                                            No users found.
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === "products" && (
                        <div className="overflow-x-auto">
                            {loadingProducts ? (
                                <div className="text-center py-10 text-gray-500">
                                    Loading products...
                                </div>
                            ) : (
                                <>
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Product
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Description
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Base Price
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Variations
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {products.map((product) => (
                                                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            {product.image_url && (
                                                                <div className="h-10 w-10 flex-shrink-0 mr-3">
                                                                    <img className="h-10 w-10 rounded-full object-cover" src={product.image_url} alt="" />
                                                                </div>
                                                            )}
                                                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                        {product.description}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                        ₱{product.base_price.toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                  ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                            {product.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {product.variations?.length || 0}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex justify-end space-x-2">
                                                            <button
                                                                onClick={() => handleEditProduct(product)}
                                                                className="text-indigo-600 hover:text-indigo-900"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteProduct(product.id)}
                                                                className="text-red-600 hover:text-red-900"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {products.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500 text-sm">
                                                        No products found. Add your first product.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === "payments" && (
                        <div className="overflow-x-auto">
                            {loadingPaymentMethods ? (
                                <div className="p-8 text-center text-gray-500 flex justify-center items-center">
                                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                    Loading payment methods...
                                </div>
                            ) : (
                                <>
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Name
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Description
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Created
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {paymentMethods.map((pm) => (
                                                <tr key={pm.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <CreditCard className="h-5 w-5 text-gray-400 mr-3" />
                                                            <div className="text-sm font-medium text-gray-900">{pm.name}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                        {pm.description || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                            ${pm.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                            {pm.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(pm.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex justify-end space-x-2">
                                                            <button
                                                                onClick={() => handleEditPaymentMethod(pm)}
                                                                className="text-indigo-600 hover:text-indigo-900"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeletePaymentMethod(pm.id)}
                                                                className="text-red-600 hover:text-red-900"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {paymentMethods.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500 text-sm">
                                                        No payment methods found. Add your first payment method.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === "settings" && (
                        <div className="p-6">
                            {loadingSettings ? (
                                <div className="p-8 text-center text-gray-500 flex justify-center items-center">
                                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                    Loading settings...
                                </div>
                            ) : (
                                <div className="max-w-2xl">
                                    <div className="mb-6">
                                        <h3 className="text-lg font-medium text-gray-900">Email Notifications</h3>
                                        <p className="mt-1 text-sm text-gray-500">
                                            Configure where order notifications are sent when customers place new orders.
                                        </p>
                                    </div>

                                    {/* Success/Error Message */}
                                    {settingsMessage && (
                                        <div className={`mb-4 p-4 rounded-md ${settingsMessage.type === 'success'
                                            ? 'bg-green-50 text-green-800 border border-green-200'
                                            : 'bg-red-50 text-red-800 border border-red-200'
                                            }`}>
                                            <div className="flex items-center">
                                                {settingsMessage.type === 'success' ? (
                                                    <CheckCircle2 className="h-5 w-5 mr-2" />
                                                ) : (
                                                    <XCircle className="h-5 w-5 mr-2" />
                                                )}
                                                {settingsMessage.text}
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                        <div className="flex items-start space-x-4">
                                            <div className="flex-shrink-0">
                                                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                                                    <Mail className="h-6 w-6 text-indigo-600" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <label htmlFor="notification-email" className="block text-sm font-medium text-gray-900">
                                                    Notification Email Address
                                                </label>
                                                <p className="text-sm text-gray-500 mb-3">
                                                    Enter the email address where you want to receive order notifications.
                                                </p>
                                                <div className="flex space-x-3">
                                                    <input
                                                        type="email"
                                                        id="notification-email"
                                                        value={notificationEmail}
                                                        onChange={(e) => setNotificationEmail(e.target.value)}
                                                        placeholder="admin@example.com"
                                                        className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-4 py-2 border"
                                                    />
                                                    <button
                                                        onClick={handleSaveNotificationEmail}
                                                        disabled={savingSettings}
                                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {savingSettings ? (
                                                            <>
                                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                Saving...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Save className="h-4 w-4 mr-2" />
                                                                Save
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <h4 className="text-sm font-medium text-blue-800 mb-2">ℹ️ How it works</h4>
                                        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                                            <li>When a customer places an order, you&apos;ll receive an email notification</li>
                                            <li>The email includes customer details, product info, and order total</li>
                                            <li>Leave empty to disable email notifications</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ID Preview Modal */}
            {isIdModalOpen && selectedUserForId && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="id-modal-title" role="dialog" aria-modal="true">
                    <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
                        {/* Background overlay */}
                        <div
                            className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
                            onClick={handleCloseIdModal}
                        />

                        {/* Modal panel */}
                        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                            {/* Header */}
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900" id="id-modal-title">
                                    ID Verification
                                </h3>
                                <button
                                    onClick={handleCloseIdModal}
                                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    <span className="sr-only">Close</span>
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="bg-white px-4 py-5 sm:p-6">
                                {/* User Info */}
                                <div className="mb-4 flex items-center">
                                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg">
                                        {(selectedUserForId.full_name || selectedUserForId.email.split('@')[0]).charAt(0).toUpperCase()}
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-900">
                                            {selectedUserForId.full_name || selectedUserForId.email.split('@')[0]}
                                        </p>
                                        <p className="text-sm text-gray-500">{selectedUserForId.email}</p>
                                        {selectedUserForId.id_type && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                ID Type: <span className="font-medium text-gray-600">{selectedUserForId.id_type}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* ID Image */}
                                <div className="border rounded-lg overflow-hidden bg-gray-100">
                                    {selectedUserForId.id_proof_url ? (
                                        <div className="relative w-full" style={{ minHeight: '300px' }}>
                                            <Image
                                                src={selectedUserForId.id_proof_url}
                                                alt={`ID proof for ${selectedUserForId.full_name || selectedUserForId.email}`}
                                                fill
                                                className="object-contain"
                                                sizes="(max-width: 768px) 100vw, 600px"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-64 text-gray-400">
                                            No ID image available
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer with actions */}
                            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleApproveVip(selectedUserForId.id);
                                        handleCloseIdModal();
                                    }}
                                    className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:ml-3 sm:w-auto"
                                >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Approve VIP
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleRejectVip(selectedUserForId.id);
                                        handleCloseIdModal();
                                    }}
                                    className="mt-3 inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:mt-0 sm:ml-3 sm:w-auto"
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCloseIdModal}
                                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ProductModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                onSave={handleSaveProduct}
                productToEdit={editingProduct}
            />

            <PaymentMethodModal
                isOpen={isPaymentMethodModalOpen}
                onClose={() => setIsPaymentMethodModalOpen(false)}
                onSave={handleSavePaymentMethod}
                paymentMethodToEdit={editingPaymentMethod}
            />

            {/* User Profile Modal */}
            {isUserProfileModalOpen && selectedUserProfile && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="user-profile-modal-title" role="dialog" aria-modal="true">
                    <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
                        {/* Background overlay */}
                        <div
                            className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
                            onClick={handleCloseUserProfileModal}
                        />

                        {/* Modal panel */}
                        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                            {/* Header */}
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900" id="user-profile-modal-title">
                                    User Profile
                                </h3>
                                <button
                                    onClick={handleCloseUserProfileModal}
                                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    <span className="sr-only">Close</span>
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="bg-white px-4 py-5 sm:p-6">
                                {/* User Info */}
                                <div className="mb-6 flex items-center">
                                    <div className="h-16 w-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl">
                                        {(selectedUserProfile.full_name || selectedUserProfile.email.split('@')[0]).charAt(0).toUpperCase()}
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-lg font-medium text-gray-900">
                                            {selectedUserProfile.full_name || selectedUserProfile.email.split('@')[0]}
                                        </p>
                                        <p className="text-sm text-gray-500">{selectedUserProfile.email}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${selectedUserProfile.role === 'vip' ? 'bg-purple-100 text-purple-800' :
                                                    selectedUserProfile.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {selectedUserProfile.role.toUpperCase()}
                                            </span>
                                            {selectedUserProfile.is_approved && (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                    Verified
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* User Details */}
                                <div className="border-t border-gray-200 pt-4">
                                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Joined Date</dt>
                                            <dd className="mt-1 text-sm text-gray-900">
                                                {new Date(selectedUserProfile.created_at).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </dd>
                                        </div>
                                        {selectedUserProfile.id_type && (
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">ID Type</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{selectedUserProfile.id_type}</dd>
                                            </div>
                                        )}
                                    </dl>
                                </div>

                                {/* ID Proof Image */}
                                {selectedUserProfile.id_proof_url && (
                                    <div className="mt-6">
                                        <h4 className="text-sm font-medium text-gray-900 mb-3">Submitted ID Document</h4>
                                        <div className="border rounded-lg overflow-hidden bg-gray-100">
                                            <div className="relative w-full" style={{ minHeight: '300px' }}>
                                                <Image
                                                    src={selectedUserProfile.id_proof_url}
                                                    alt={`ID proof for ${selectedUserProfile.full_name || selectedUserProfile.email}`}
                                                    fill
                                                    className="object-contain"
                                                    sizes="(max-width: 768px) 100vw, 600px"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={handleCloseUserProfileModal}
                                    className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:w-auto"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Details Modal */}
            {isOrderDetailsModalOpen && selectedOrder && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="order-details-modal-title" role="dialog" aria-modal="true">
                    <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
                        {/* Background overlay */}
                        <div
                            className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
                            onClick={handleCloseOrderDetailsModal}
                        />

                        {/* Modal panel */}
                        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                            {/* Header */}
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900" id="order-details-modal-title">
                                        Order Details
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        Order ID: {selectedOrder.id}
                                    </p>
                                </div>
                                <button
                                    onClick={handleCloseOrderDetailsModal}
                                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    <span className="sr-only">Close</span>
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="bg-white px-4 py-5 sm:p-6 space-y-6">
                                {/* Status Badge */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full 
                                            ${selectedOrder.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                selectedOrder.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                                    selectedOrder.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'}`}>
                                            {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                                        </span>
                                    </div>
                                    <select
                                        value={selectedOrder.status}
                                        onChange={(e) => {
                                            handleUpdateOrderStatus(selectedOrder.id, e.target.value as OrderStatus);
                                            setSelectedOrder({ ...selectedOrder, status: e.target.value as OrderStatus });
                                        }}
                                        className="block pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="processing">Processing</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>

                                {/* Customer Info */}
                                <div className="border rounded-lg p-4 bg-gray-50">
                                    <h4 className="text-sm font-medium text-gray-500 mb-3">Customer</h4>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                                {(selectedOrder.user?.full_name || selectedOrder.user?.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {selectedOrder.user?.full_name || selectedOrder.user?.email?.split('@')[0] || 'Unknown User'}
                                                </p>
                                                <p className="text-sm text-gray-500">{selectedOrder.user?.email}</p>
                                            </div>
                                        </div>
                                        {selectedOrder.user && (
                                            <button
                                                onClick={() => {
                                                    handleCloseOrderDetailsModal();
                                                    handleViewUserProfile(selectedOrder.user);
                                                }}
                                                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium hover:underline"
                                            >
                                                View Profile →
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Order Details Grid */}
                                <div className="border-t border-gray-200 pt-4">
                                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Product</dt>
                                            <dd className="mt-1 text-sm text-gray-900">
                                                {selectedOrder.product?.name || 'Custom Request'}
                                            </dd>
                                        </div>
                                        {selectedOrder.variation && (
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Variation</dt>
                                                <dd className="mt-1 text-sm text-gray-900">
                                                    {selectedOrder.variation.name}: {selectedOrder.variation.value}
                                                </dd>
                                            </div>
                                        )}
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Quantity</dt>
                                            <dd className="mt-1 text-sm text-gray-900">{selectedOrder.quantity}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                                            <dd className="mt-1 text-sm font-semibold text-gray-900">
                                                {selectedOrder.total_amount ? `₱${selectedOrder.total_amount.toFixed(2)}` : 'N/A'}
                                            </dd>
                                        </div>
                                        {selectedOrder.payment_method && (
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Payment Method</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{selectedOrder.payment_method.name}</dd>
                                            </div>
                                        )}
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Order Date</dt>
                                            <dd className="mt-1 text-sm text-gray-900">
                                                {new Date(selectedOrder.created_at).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                                            <dd className="mt-1 text-sm text-gray-900">
                                                {new Date(selectedOrder.updated_at).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>

                                {/* Description */}
                                {selectedOrder.description && (
                                    <div className="border-t border-gray-200 pt-4">
                                        <h4 className="text-sm font-medium text-gray-500 mb-2">Description / Notes</h4>
                                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                                            {selectedOrder.description}
                                        </p>
                                    </div>
                                )}

                                {/* Reference Files / Attachments */}
                                {selectedOrder.reference_file_urls && selectedOrder.reference_file_urls.length > 0 && (
                                    <div className="border-t border-gray-200 pt-4">
                                        <h4 className="text-sm font-medium text-gray-500 mb-3">Attached Documents ({selectedOrder.reference_file_urls.length})</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {selectedOrder.reference_file_urls.map((url, index) => (
                                                <div key={index} className="border rounded-lg overflow-hidden bg-gray-100">
                                                    {/* Check if it's an image by extension */}
                                                    {/\.(jpg|jpeg|png|gif|webp)$/i.test(url) ? (
                                                        <div className="relative w-full" style={{ height: '150px' }}>
                                                            <Image
                                                                src={url}
                                                                alt={`Order reference file ${index + 1}`}
                                                                fill
                                                                className="object-contain"
                                                                sizes="(max-width: 768px) 100vw, 350px"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="p-4 flex items-center justify-center" style={{ height: '150px' }}>
                                                            <a
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                            >
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                File {index + 1}
                                                            </a>
                                                        </div>
                                                    )}
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block text-xs text-indigo-600 hover:underline p-2 bg-gray-50 truncate"
                                                    >
                                                        View File {index + 1}
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-gray-200 sticky bottom-0">
                                <button
                                    type="button"
                                    onClick={handleCloseOrderDetailsModal}
                                    className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:w-auto"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
