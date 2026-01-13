import Link from "next/link";
import { ArrowRight, Package, Clock, CheckCircle2, XCircle } from "lucide-react";
import { getMyOrdersAction } from "@/app/actions/orders";

export default async function MyOrdersPage() {
    const myOrders = await getMyOrdersAction();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800 border-green-200';
            case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="w-5 h-5 mr-1" />;
            case 'cancelled': return <XCircle className="w-5 h-5 mr-1" />;
            default: return <Clock className="w-5 h-5 mr-1" />;
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-extrabold uppercase tracking-tighter">My Orders</h1>
                <Link
                    href="/dashboard/order"
                    className="inline-flex items-center px-4 py-2 bg-[var(--color-brand-cyan)] text-white font-bold uppercase border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                    New Request <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
            </div>

            {myOrders.length === 0 ? (
                <div className="bg-white border-4 border-black p-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-xl font-bold uppercase mb-2">No orders found</h3>
                    <p className="text-gray-600 mb-6">You haven't placed any orders yet.</p>
                    <Link
                        href="/dashboard/order"
                        className="inline-block px-6 py-3 bg-[var(--color-brand-magenta)] text-white font-bold uppercase border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                    >
                        Start Your First Order
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {myOrders.map((order) => (
                        <div
                            key={order.id}
                            className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b-2 border-gray-100 pb-4 mb-4">
                                <div>
                                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Order ID</span>
                                    <p className="text-xl font-black">{order.id.slice(0, 8)}...</p>
                                </div>
                                <div className="md:text-right">
                                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Date Placed</span>
                                    <p className="font-bold">{new Date(order.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h4 className="text-lg font-bold">{order.product?.name || 'Custom Request'}</h4>
                                    <p className="text-sm text-gray-600">Quantity: {order.quantity}</p>
                                    <div className="flex items-center mt-2">
                                        <div className={`flex items-center px-3 py-1 rounded-full border-2 text-sm font-bold uppercase ${getStatusColor(order.status)}`}>
                                            {getStatusIcon(order.status)}
                                            {order.status}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider block">Total Amount</span>
                                    {order.total_amount ? (
                                        <span className="text-2xl font-black text-[var(--color-brand-magenta)]">₱{order.total_amount.toFixed(2)}</span>
                                    ) : (
                                        <span className="text-xl font-bold text-gray-400 italic">Pending Quote</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
