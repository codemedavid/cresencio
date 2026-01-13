"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useRef, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { productService } from "@/lib/productService";
import { getActivePaymentMethodsAction } from "@/app/actions/paymentMethods";
import { ProductWithVariations, PaymentMethod, CartItem } from "@/lib/types/database";
import { createOrderAction } from "@/app/actions/orders";
import { getCloudinarySignature } from "@/app/actions/cloudinary";
import Image from "next/image";
import Link from "next/link";
import { CreditCard, Wallet, Building, Phone, Check, Loader2, Upload, X } from "lucide-react";

// Type for tracking files per cart item
interface ItemFiles {
    files: File[];
    uploadProgress: Map<string, number>; // filename -> progress %
    uploadedUrls: string[];
}

// Helper function to get the appropriate icon for a payment method
const getPaymentIcon = (methodName: string) => {
    const name = methodName.toLowerCase();
    if (name.includes('gcash') || name.includes('maya') || name.includes('paymaya')) {
        return <Phone className="w-6 h-6" />;
    }
    if (name.includes('bank') || name.includes('transfer')) {
        return <Building className="w-6 h-6" />;
    }
    if (name.includes('cash') || name.includes('cod')) {
        return <Wallet className="w-6 h-6" />;
    }
    return <CreditCard className="w-6 h-6" />;
};

// Helper to check for duplicate files by name and size
const isDuplicateFile = (existingFiles: File[], newFile: File): boolean => {
    return existingFiles.some(f => f.name === newFile.name && f.size === newFile.size);
};

// Reusable PaymentMethodSelector component
interface PaymentMethodSelectorProps {
    paymentMethods: PaymentMethod[];
    selectedPaymentMethod: string;
    onSelect: (id: string) => void;
    loading: boolean;
}

const PaymentMethodSelector = ({ paymentMethods, selectedPaymentMethod, onSelect, loading }: PaymentMethodSelectorProps) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 border-2 border-dashed border-black bg-gray-50">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="font-bold text-gray-600">Loading payment methods...</span>
            </div>
        );
    }

    if (paymentMethods.length === 0) {
        return (
            <div className="py-6 text-center border-2 border-dashed border-black bg-gray-50">
                <Wallet className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                <p className="font-bold text-gray-600">No payment methods available</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paymentMethods.map(pm => {
                    const isSelected = selectedPaymentMethod === pm.id;
                    return (
                        <button
                            key={pm.id}
                            type="button"
                            onClick={() => onSelect(pm.id)}
                            className={`relative p-4 text-left border-2 border-black transition-all ${isSelected
                                ? 'bg-[var(--color-pastel-green)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]'
                                : 'bg-white hover:bg-gray-50 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                }`}
                        >
                            {/* Selected checkmark */}
                            {isSelected && (
                                <div className="absolute top-2 right-2 bg-black rounded-full p-1">
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            )}

                            {/* Icon and name row */}
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 border-2 border-black ${isSelected ? 'bg-white' : 'bg-[var(--color-pastel-yellow)]'
                                    }`}>
                                    {getPaymentIcon(pm.name)}
                                </div>
                                <span className="font-extrabold text-sm uppercase tracking-wide">
                                    {pm.name}
                                </span>
                            </div>

                            {/* Description */}
                            {pm.description && (
                                <p className="text-xs text-gray-600 font-medium leading-snug pl-12">
                                    {pm.description}
                                </p>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Selection hint */}
            {!selectedPaymentMethod && paymentMethods.length > 0 && (
                <p className="mt-2 text-xs text-gray-500 font-medium">
                    Select a payment method to continue
                </p>
            )}
        </>
    );
};

// Helper to create item key
const getItemKey = (item: CartItem) => `${item.product.id}-${item.variation.id}`;

// Messenger username for order notifications
const MESSENGER_USERNAME = 'cresencio.printing.official';

// Type for order summary used in Messenger message
interface OrderSummaryItem {
    productName: string;
    variation: string;
    quantity: number;
    price: number;
}

interface OrderSummary {
    items: OrderSummaryItem[];
    total: number;
    notes: string;
    paymentMethod: string;
}

// Helper to generate Messenger URL with pre-filled message
const generateMessengerUrl = (summary: OrderSummary): string => {
    let message = '🛍️ NEW ORDER REQUEST\n\n';
    message += '📦 ORDER DETAILS:\n';
    message += '------------------------\n';

    summary.items.forEach((item, index) => {
        message += `${index + 1}. ${item.productName}\n`;
        message += `   • Variation: ${item.variation}\n`;
        message += `   • Quantity: ${item.quantity}\n`;
        message += `   • Price: ₱${item.price.toFixed(2)}\n`;
        if (index < summary.items.length - 1) message += '\n';
    });

    message += '------------------------\n';
    message += `💰 TOTAL: ₱${summary.total.toFixed(2)}\n\n`;

    if (summary.paymentMethod) {
        message += `💳 Payment Method: ${summary.paymentMethod}\n\n`;
    }

    if (summary.notes) {
        message += `📝 Notes: ${summary.notes}\n\n`;
    }

    message += 'Thank you! Looking forward to your response. 🙏';

    const encodedMessage = encodeURIComponent(message);
    return `https://m.me/${MESSENGER_USERNAME}?text=${encodedMessage}`;
};

function OrderForm() {
    const searchParams = useSearchParams();
    const productId = searchParams.get("product");
    const { cartItems, clearCart, cartTotal } = useCart();

    // Mode: 'cart' (checkout from cart) or 'custom' (custom request form)
    const [mode, setMode] = useState<'cart' | 'custom'>(cartItems.length > 0 ? 'cart' : 'custom');

    // State for custom request form
    const [products, setProducts] = useState<ProductWithVariations[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState(productId || "");
    const [selectedVariation, setSelectedVariation] = useState<string>("");
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [description, setDescription] = useState<string>('');

    // Files for custom request mode
    const [files, setFiles] = useState<File[]>([]);
    const [fileError, setFileError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [customUploadProgress, setCustomUploadProgress] = useState<Map<string, number>>(new Map());

    // Per-item files for cart mode
    const [itemFiles, setItemFiles] = useState<Map<string, ItemFiles>>(new Map());
    const [uploadingItems, setUploadingItems] = useState<Set<string>>(new Set());
    const itemFileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

    // Payment method state
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
    const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);

    // Get the currently selected product object
    const currentProduct = products.find(p => p.id === selectedProduct);
    const availableVariations = currentProduct?.variations?.filter(v => v.is_active) || [];

    // Fetch products for custom request
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const data = await productService.getProducts();
                setProducts(data);
            } catch (error) {
                console.error("Failed to fetch products", error);
            } finally {
                setLoadingProducts(false);
            }
        };
        fetchProducts();
    }, []);

    // Fetch payment methods
    useEffect(() => {
        const fetchPaymentMethods = async () => {
            try {
                const data = await getActivePaymentMethodsAction();
                setPaymentMethods(data);
            } catch (error) {
                console.error("Failed to fetch payment methods", error);
            } finally {
                setLoadingPaymentMethods(false);
            }
        };
        fetchPaymentMethods();
    }, []);

    const handleFileChange = (fileList: FileList | null) => {
        if (fileList && fileList.length > 0) {
            const newFiles: File[] = [];
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

            for (let i = 0; i < fileList.length; i++) {
                const selectedFile = fileList[i];
                if (!allowedTypes.includes(selectedFile.type)) {
                    setFileError('Invalid file type. Please upload JPG, PNG, GIF, or PDF files only.');
                    continue;
                }
                if (selectedFile.size > 10 * 1024 * 1024) {
                    setFileError('One or more files exceed 10MB limit.');
                    continue;
                }
                // Check if file already added
                if (!files.some(f => f.name === selectedFile.name && f.size === selectedFile.size)) {
                    newFiles.push(selectedFile);
                }
            }

            if (newFiles.length > 0) {
                setFiles(prev => [...prev, ...newFiles]);
                setFileError(null);
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        handleFileChange(e.dataTransfer.files);
    };

    // Per-item file handlers for cart mode
    const handleItemFileChange = (itemKey: string, fileList: FileList | null) => {
        if (fileList && fileList.length > 0) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
            const newFiles: File[] = [];

            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                if (!allowedTypes.includes(file.type)) {
                    setFileError('Invalid file type. Please upload JPG, PNG, GIF, or PDF files only.');
                    continue;
                }
                if (file.size > 10 * 1024 * 1024) {
                    setFileError('One or more files exceed 10MB limit.');
                    continue;
                }
                newFiles.push(file);
            }

            if (newFiles.length > 0) {
                setItemFiles(prev => {
                    const updated = new Map(prev);
                    const existing = updated.get(itemKey) || { files: [], uploadProgress: new Map(), uploadedUrls: [] };
                    // Add new files, avoiding duplicates (by name+size for consistency)
                    const filteredNew = newFiles.filter(f => !isDuplicateFile(existing.files, f));
                    updated.set(itemKey, {
                        ...existing,
                        files: [...existing.files, ...filteredNew]
                    });
                    return updated;
                });
                setFileError(null);
            }

            // Clear the input
            const input = itemFileInputRefs.current.get(itemKey);
            if (input) input.value = '';
        }
    };

    const removeItemFile = (itemKey: string, fileIndex: number) => {
        setItemFiles(prev => {
            const updated = new Map(prev);
            const existing = updated.get(itemKey);
            if (existing) {
                updated.set(itemKey, {
                    ...existing,
                    files: existing.files.filter((_, i) => i !== fileIndex)
                });
            }
            return updated;
        });
    };

    // Helper to clear upload progress for an item on failure
    const clearUploadProgress = (itemKey: string, fileName: string) => {
        setItemFiles(prev => {
            const updated = new Map(prev);
            const existing = updated.get(itemKey);
            if (existing) {
                const newProgress = new Map(existing.uploadProgress);
                newProgress.delete(fileName);
                updated.set(itemKey, { ...existing, uploadProgress: newProgress });
            }
            return updated;
        });
    };

    // Upload a single file with progress tracking
    const uploadFileWithProgress = async (
        file: File,
        itemKey: string,
        folder: string
    ): Promise<string> => {
        const { timestamp, signature, cloudName, apiKey } = await getCloudinarySignature(folder);

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', apiKey || '');
            formData.append('timestamp', timestamp.toString());
            formData.append('signature', signature);
            formData.append('folder', folder);

            // Set timeout to 60 seconds
            xhr.timeout = 60_000;

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const progress = Math.round((e.loaded / e.total) * 100);
                    setItemFiles(prev => {
                        const updated = new Map(prev);
                        const existing = updated.get(itemKey);
                        if (existing) {
                            const newProgress = new Map(existing.uploadProgress);
                            newProgress.set(file.name, progress);
                            updated.set(itemKey, { ...existing, uploadProgress: newProgress });
                        }
                        return updated;
                    });
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        resolve(data.secure_url);
                    } catch {
                        clearUploadProgress(itemKey, file.name);
                        reject(new Error(`Failed to parse upload response for ${file.name} (item: ${itemKey}). Status: ${xhr.status}, Response: ${xhr.responseText.substring(0, 200)}`));
                    }
                } else {
                    clearUploadProgress(itemKey, file.name);
                    reject(new Error(`Upload failed for ${file.name} (item: ${itemKey}). Status: ${xhr.status}`));
                }
            };

            xhr.onerror = () => {
                clearUploadProgress(itemKey, file.name);
                reject(new Error(`Network error while uploading ${file.name} (item: ${itemKey})`));
            };

            xhr.ontimeout = () => {
                xhr.abort();
                clearUploadProgress(itemKey, file.name);
                reject(new Error(`Upload timed out for ${file.name} (item: ${itemKey}) after 60 seconds`));
            };

            xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);
            xhr.send(formData);
        });
    };

    // Submit cart items as separate orders
    const handleCartSubmit = async () => {
        setSubmitting(true);
        setSubmitError(null);

        try {
            const folder = "warped-comet/orders";

            // Create an order for each cart item with its own files
            for (const item of cartItems) {
                const itemKey = getItemKey(item);
                const itemFileData = itemFiles.get(itemKey);
                const filesToUpload = itemFileData?.files || [];

                // Mark this item as uploading
                if (filesToUpload.length > 0) {
                    setUploadingItems(prev => new Set(prev).add(itemKey));
                }

                // Upload files for this item with progress tracking
                const fileUrls: string[] = [];
                for (const file of filesToUpload) {
                    try {
                        const url = await uploadFileWithProgress(file, itemKey, folder);
                        fileUrls.push(url);
                    } catch {
                        throw new Error(`Failed to upload ${file.name}`);
                    }
                }

                // Clear uploading state for this item
                setUploadingItems(prev => {
                    const next = new Set(prev);
                    next.delete(itemKey);
                    return next;
                });

                // Create the order
                const orderFormData = new FormData();
                orderFormData.append('product_id', item.product.id);
                orderFormData.append('variation_id', item.variation.id);
                orderFormData.append('quantity', item.quantity.toString());
                orderFormData.append('description', description || `Order for ${item.product.name} - ${item.variation.value}`);
                if (fileUrls.length > 0) {
                    orderFormData.append('reference_file_urls', JSON.stringify(fileUrls));
                }
                if (selectedPaymentMethod) {
                    orderFormData.append('payment_method_id', selectedPaymentMethod);
                }

                const result = await createOrderAction(orderFormData);
                if (!result.success) {
                    throw new Error(result.error || 'Failed to create order');
                }
            }

            // Build order summary for Messenger
            const selectedPM = paymentMethods.find(pm => pm.id === selectedPaymentMethod);
            const summaryItems: OrderSummaryItem[] = cartItems.map(item => {
                const itemPrice = (item.product.base_price || 0) + (item.variation.price_modifier || 0);
                return {
                    productName: item.product.name,
                    variation: `${item.variation.name}: ${item.variation.value}`,
                    quantity: item.quantity,
                    price: itemPrice * item.quantity
                };
            });

            setOrderSummary({
                items: summaryItems,
                total: cartTotal,
                notes: description,
                paymentMethod: selectedPM?.name || ''
            });

            clearCart();
            setSubmitted(true);
        } catch (error) {
            console.error('Order submission error:', error);
            const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
            setSubmitError(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    // Submit custom request
    const handleCustomSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setSubmitError(null);
        setCustomUploadProgress(new Map());

        try {
            // Upload all files with progress tracking
            const fileUrls: string[] = [];
            if (files.length > 0) {
                const folder = "warped-comet/orders";
                for (const file of files) {
                    const { timestamp, signature, cloudName, apiKey } = await getCloudinarySignature(folder);

                    const url = await new Promise<string>((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('api_key', apiKey || '');
                        formData.append('timestamp', timestamp.toString());
                        formData.append('signature', signature);
                        formData.append('folder', folder);

                        xhr.upload.onprogress = (e) => {
                            if (e.lengthComputable) {
                                const progress = Math.round((e.loaded / e.total) * 100);
                                setCustomUploadProgress(prev => {
                                    const updated = new Map(prev);
                                    updated.set(file.name, progress);
                                    return updated;
                                });
                            }
                        };

                        xhr.onload = () => {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                const data = JSON.parse(xhr.responseText);
                                resolve(data.secure_url);
                            } else {
                                reject(new Error('Upload failed'));
                            }
                        };

                        xhr.onerror = () => reject(new Error('Upload failed'));
                        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);
                        xhr.send(formData);
                    });

                    fileUrls.push(url);
                }
            }

            const orderFormData = new FormData();
            orderFormData.append('product_id', selectedProduct);
            orderFormData.append('variation_id', selectedVariation);
            orderFormData.append('quantity', quantity.toString());
            orderFormData.append('description', description);
            if (fileUrls.length > 0) {
                orderFormData.append('reference_file_urls', JSON.stringify(fileUrls));
            }
            if (selectedPaymentMethod) {
                orderFormData.append('payment_method_id', selectedPaymentMethod);
            }

            const result = await createOrderAction(orderFormData);
            if (result.success) {
                // Build order summary for Messenger
                const selectedPM = paymentMethods.find(pm => pm.id === selectedPaymentMethod);
                const productName = currentProduct?.name || 'Custom Request';
                const variationText = selectedVariation ?
                    availableVariations.find(v => v.id === selectedVariation) : null;
                const itemPrice = (currentProduct?.base_price || 0) + (variationText?.price_modifier || 0);

                setOrderSummary({
                    items: [{
                        productName,
                        variation: variationText ? `${variationText.name}: ${variationText.value}` : 'N/A',
                        quantity,
                        price: itemPrice * quantity
                    }],
                    total: itemPrice * quantity,
                    notes: description,
                    paymentMethod: selectedPM?.name || ''
                });

                setSubmitted(true);
            } else {
                setSubmitError(result.error || 'Failed to submit order');
            }
        } catch (error) {
            console.error('Order submission error:', error);
            const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
            setSubmitError(errorMsg);
        } finally {
            setSubmitting(false);
            setCustomUploadProgress(new Map());
        }
    };

    if (submitted) {
        const messengerUrl = orderSummary ? generateMessengerUrl(orderSummary) : `https://m.me/${MESSENGER_USERNAME}`;

        return (
            <div className="max-w-2xl mx-auto">
                <div className="bg-[#a3e635] border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
                    <h2 className="text-4xl font-extrabold uppercase mb-4">Order Submitted!</h2>
                    <p className="font-bold text-lg mb-4">We'll get back to you shortly with a quote and preview.</p>

                    {/* Messenger CTA */}
                    <div className="bg-white border-2 border-black p-4 mb-6">
                        <p className="font-bold text-sm mb-3">📱 Contact us on Messenger to confirm your order:</p>
                        <a
                            href={messengerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0084ff] text-white border-2 border-black font-extrabold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.36 2 1.73 6.13 1.73 11.04c0 2.83 1.4 5.36 3.59 7.01V22l3.6-1.98c.97.27 2 .42 3.08.42 5.64 0 10.27-4.13 10.27-9.04S17.64 2 12 2zm1.03 12.18l-2.62-2.8-5.1 2.8 5.61-5.96 2.68 2.8 5.04-2.8-5.61 5.96z" />
                            </svg>
                            Open Messenger
                        </a>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/dashboard/my-orders"
                            className="inline-block px-8 py-4 bg-white border-2 border-black font-extrabold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            View My Orders
                        </Link>
                        <Link
                            href="/dashboard"
                            className="inline-block px-8 py-4 bg-[var(--color-pastel-blue)] border-2 border-black font-extrabold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            Continue Shopping
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl font-extrabold uppercase mb-8 tracking-tighter">Checkout</h1>

            {/* Mode Toggle */}
            {cartItems.length > 0 && (
                <div className="flex mb-6 border-2 border-black">
                    <button
                        onClick={() => setMode('cart')}
                        className={`flex-1 p-3 font-extrabold uppercase text-sm transition-colors ${mode === 'cart' ? 'bg-[var(--color-brand-blue)] text-white' : 'bg-white hover:bg-gray-100'
                            }`}
                    >
                        Cart ({cartItems.length} items)
                    </button>
                    <button
                        onClick={() => setMode('custom')}
                        className={`flex-1 p-3 font-extrabold uppercase text-sm border-l-2 border-black transition-colors ${mode === 'custom' ? 'bg-[var(--color-brand-blue)] text-white' : 'bg-white hover:bg-gray-100'
                            }`}
                    >
                        Custom Request
                    </button>
                </div>
            )}

            {submitError && (
                <div className="mb-6 bg-red-100 border-2 border-red-500 text-red-800 p-4 font-bold">
                    {submitError}
                </div>
            )}

            {/* Cart Checkout */}
            {mode === 'cart' && cartItems.length > 0 ? (
                <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h2 className="text-xl font-extrabold uppercase mb-6">Your Cart Items</h2>

                    <div className="space-y-4 mb-6">
                        {cartItems.map((item) => {
                            const itemPrice = (item.product.base_price || 0) + (item.variation.price_modifier || 0);
                            const itemKey = getItemKey(item);
                            const itemFileData = itemFiles.get(itemKey);
                            const currentFiles = itemFileData?.files || [];
                            const uploadProgress = itemFileData?.uploadProgress || new Map();
                            const isUploading = uploadingItems.has(itemKey);

                            return (
                                <div
                                    key={itemKey}
                                    className="p-4 bg-[var(--color-pastel-blue)] border-2 border-black"
                                >
                                    <div className="flex gap-4">
                                        <div className="w-16 h-16 border-2 border-black bg-white overflow-hidden flex-shrink-0">
                                            <Image
                                                src={item.product.image_url || "/placeholder.jpg"}
                                                alt={item.product.name}
                                                width={64}
                                                height={64}
                                                className="object-cover w-full h-full"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-extrabold text-sm uppercase">{item.product.name}</h3>
                                            <p className="text-xs font-bold text-gray-600">{item.variation.name}: {item.variation.value}</p>
                                            <p className="text-sm font-bold mt-1">Qty: {item.quantity} × ₱{itemPrice.toFixed(2)}</p>
                                        </div>
                                        <div className="font-extrabold">
                                            ₱{(itemPrice * item.quantity).toFixed(2)}
                                        </div>
                                    </div>

                                    {/* Per-item file upload */}
                                    <div className="mt-3 pt-3 border-t border-black/20">
                                        <input
                                            type="file"
                                            ref={el => { if (el) itemFileInputRefs.current.set(itemKey, el); }}
                                            onChange={(e) => handleItemFileChange(itemKey, e.target.files)}
                                            accept=".jpg,.jpeg,.png,.gif,.pdf"
                                            className="hidden"
                                            multiple
                                            disabled={isUploading || submitting}
                                        />
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => itemFileInputRefs.current.get(itemKey)?.click()}
                                                disabled={isUploading || submitting}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-white border-2 border-black text-xs font-bold uppercase hover:bg-gray-100 transition-colors disabled:opacity-50"
                                            >
                                                <Upload className="w-3 h-3" />
                                                Attach Files
                                            </button>
                                            {currentFiles.length > 0 && (
                                                <span className="text-xs font-bold text-gray-600">
                                                    {currentFiles.length} file(s)
                                                </span>
                                            )}
                                        </div>

                                        {/* File list with progress */}
                                        {currentFiles.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {currentFiles.map((file, fileIdx) => {
                                                    const progress = uploadProgress.get(file.name);
                                                    return (
                                                        <div key={`${file.name}-${fileIdx}`} className="flex items-center gap-2 bg-white border border-black/50 p-1.5 text-xs">
                                                            <span className="flex-1 truncate font-bold">{file.name}</span>
                                                            {isUploading && progress !== undefined ? (
                                                                <div className="flex items-center gap-2 min-w-[80px]">
                                                                    <div className="flex-1 h-2 bg-gray-200 rounded overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-green-500 transition-all duration-200"
                                                                            style={{ width: `${progress}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-[10px] font-bold w-8">{progress}%</span>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeItemFile(itemKey, fileIdx)}
                                                                    disabled={submitting}
                                                                    className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="border-t-2 border-black pt-4 mb-6">
                        <div className="flex justify-between items-center">
                            <span className="font-extrabold text-lg uppercase">Total</span>
                            <span className="font-extrabold text-2xl">₱{cartTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Optional description for cart orders */}
                    <div className="mb-6">
                        <label className="block font-bold mb-2 text-sm uppercase tracking-wider">Additional Notes (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-[var(--color-pastel-yellow)] border-2 border-black p-4 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all h-24"
                            placeholder="Any special instructions..."
                        />
                    </div>

                    {/* File error display */}
                    {fileError && (
                        <div className="mb-6">
                            <p className="text-red-600 font-bold text-sm">{fileError}</p>
                        </div>
                    )}

                    {/* Payment Method Selection */}
                    <div className="mb-6">
                        <label className="block font-bold mb-3 text-sm uppercase tracking-wider">Payment Method</label>
                        <PaymentMethodSelector
                            paymentMethods={paymentMethods}
                            selectedPaymentMethod={selectedPaymentMethod}
                            onSelect={setSelectedPaymentMethod}
                            loading={loadingPaymentMethods}
                        />
                    </div>

                    <button
                        onClick={handleCartSubmit}
                        disabled={submitting}
                        className="w-full bg-[#facc15] text-black border-2 border-black p-4 font-extrabold uppercase tracking-widest text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Submitting...' : 'Place Order'}
                    </button>
                </div>
            ) : (
                /* Custom Request Form */
                <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    {cartItems.length === 0 && (
                        <div className="mb-6 bg-[var(--color-pastel-yellow)] border-2 border-black p-4">
                            <p className="font-bold text-sm">
                                💡 Tip: Add products to your cart from the{' '}
                                <Link href="/dashboard" className="underline text-[var(--color-brand-blue)]">
                                    products page
                                </Link>{' '}
                                for a faster checkout!
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleCustomSubmit} className="space-y-6">
                        <div>
                            <label className="block font-bold mb-2 text-sm uppercase tracking-wider">Product Type</label>
                            <select
                                value={selectedProduct}
                                onChange={(e) => {
                                    setSelectedProduct(e.target.value);
                                    setSelectedVariation("");
                                }}
                                className="w-full bg-[var(--color-pastel-blue)] border-2 border-black p-4 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all appearance-none"
                                required
                                disabled={loadingProducts}
                            >
                                <option value="">{loadingProducts ? 'Loading products...' : 'Select a product...'}</option>
                                {!loadingProducts && products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                                <option value="custom">Custom Request</option>
                            </select>
                        </div>

                        {availableVariations.length > 0 && (
                            <div>
                                <label className="block font-bold mb-2 text-sm uppercase tracking-wider">Variation *</label>
                                <select
                                    value={selectedVariation}
                                    onChange={(e) => setSelectedVariation(e.target.value)}
                                    className="w-full bg-[var(--color-pastel-yellow)] border-2 border-black p-4 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all appearance-none"
                                    required
                                >
                                    <option value="">Select a variation...</option>
                                    {availableVariations.map(v => (
                                        <option key={v.id} value={v.id}>
                                            {v.name}: {v.value} {v.price_modifier > 0 ? `(+₱${v.price_modifier.toFixed(2)})` : v.price_modifier < 0 ? `(-₱${Math.abs(v.price_modifier).toFixed(2)})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block font-bold mb-2 text-sm uppercase tracking-wider">Quantity</label>
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                                className="w-full bg-white border-2 border-black p-4 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                                placeholder="How many do you need?"
                                required
                            />
                        </div>

                        <div>
                            <label className="block font-bold mb-2 text-sm uppercase tracking-wider">Description & Details</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-[var(--color-pastel-blue)] border-2 border-black p-4 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all h-32"
                                placeholder="Tell us about your project..."
                                required
                            />
                        </div>

                        <div>
                            <label className="block font-bold mb-2 text-sm uppercase tracking-wider">Reference Files (Optional)</label>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={(e) => handleFileChange(e.target.files)}
                                accept=".jpg,.jpeg,.png,.gif,.pdf"
                                className="hidden"
                                multiple
                                disabled={submitting}
                            />
                            <div
                                onClick={() => !submitting && fileInputRef.current?.click()}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed border-black bg-gray-50 p-8 text-center cursor-pointer hover:bg-gray-100 transition-colors ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <span className="font-bold text-gray-500">
                                    {files.length > 0 ? `${files.length} file(s) selected - click to add more` : 'Click to upload or drag and drop'}
                                </span>
                            </div>
                            {files.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {files.map((f, i) => {
                                        const progress = customUploadProgress.get(f.name);
                                        const isUploading = submitting && progress !== undefined;
                                        return (
                                            <div key={`${f.name}-${i}`} className="flex items-center gap-2 bg-gray-100 border-2 border-black p-2">
                                                <span className="font-bold text-sm truncate flex-1">{f.name}</span>
                                                {isUploading ? (
                                                    <div className="flex items-center gap-2 min-w-[100px]">
                                                        <div className="flex-1 h-2 bg-gray-300 rounded overflow-hidden">
                                                            <div
                                                                className="h-full bg-green-500 transition-all duration-200"
                                                                style={{ width: `${progress}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-bold w-8">{progress}%</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFile(i)}
                                                        disabled={submitting}
                                                        className="ml-2 text-red-600 font-extrabold hover:text-red-800 disabled:opacity-50"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {fileError && (
                                <p className="mt-2 text-red-600 font-bold text-sm">{fileError}</p>
                            )}
                        </div>

                        {/* Payment Method Selection */}
                        <div>
                            <label className="block font-bold mb-3 text-sm uppercase tracking-wider">Payment Method</label>
                            <PaymentMethodSelector
                                paymentMethods={paymentMethods}
                                selectedPaymentMethod={selectedPaymentMethod}
                                onSelect={setSelectedPaymentMethod}
                                loading={loadingPaymentMethods}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || (availableVariations.length > 0 && !selectedVariation)}
                            className="w-full bg-[#facc15] text-black border-2 border-black p-4 font-extrabold uppercase tracking-widest text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Submitting...' : (availableVariations.length > 0 && !selectedVariation) ? 'Select a Variation First' : 'Submit Request'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default function OrderPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <OrderForm />
        </Suspense>
    );
}
