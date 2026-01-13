export type Role = 'admin' | 'vip' | 'user';

export interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    role: Role;
    is_approved: boolean;
    id_proof_url: string | null;
    id_type: string | null;
    created_at: string;
    updated_at: string;
}

export interface Product {
    id: string;
    name: string;
    description: string | null;
    base_price: number;
    image_url: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ProductVariation {
    id: string;
    product_id: string;
    name: string;
    value: string;
    price_modifier: number;
    is_active: boolean;
    created_at: string;
}

export interface ProductWithVariations extends Product {
    variations: ProductVariation[];
}

export interface PaymentMethod {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export interface Order {
    id: string;
    user_id: string;
    product_id: string | null;
    variation_id: string | null;
    payment_method_id: string | null;
    quantity: number;
    description: string | null;
    reference_file_urls: string[];
    status: OrderStatus;
    total_amount: number | null;
    created_at: string;
    updated_at: string;
}

export interface OrderWithDetails extends Order {
    product: Product | null;
    user: Profile;
    variation: ProductVariation | null;
    payment_method: PaymentMethod | null;
}


export interface CartItem {
    product: ProductWithVariations;
    variation: ProductVariation;
    quantity: number;
}
