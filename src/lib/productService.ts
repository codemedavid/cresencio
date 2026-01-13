import { createClient } from '@/lib/supabase/client';
import { Product, ProductVariation, ProductWithVariations } from '@/lib/types/database';

const supabase = createClient();

export const productService = {
    async getProducts(): Promise<ProductWithVariations[]> {
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                variations:product_variations(*)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching products:', error);
            return [];
        }

        return data as ProductWithVariations[];
    },

    async getProductById(id: string): Promise<ProductWithVariations | null> {
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                variations:product_variations(*)
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching product:', error);
            return null;
        }

        return data as ProductWithVariations;
    },

    async createProduct(product: Partial<Product>): Promise<Product | null> {
        const { data, error } = await supabase
            .from('products')
            .insert([product])
            .select()
            .single();

        if (error) {
            console.error('Error creating product:', error);
            throw error;
        }

        return data;
    },

    async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
        const { data, error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating product:', error);
            throw error;
        }

        return data;
    },

    async deleteProduct(id: string): Promise<boolean> {
        // Soft delete by setting is_active to false
        const { error } = await supabase
            .from('products')
            .update({ is_active: false })
            .eq('id', id);

        if (error) {
            console.error('Error deleting product:', error);
            return false;
        }

        return true;
    },

    async createVariation(variation: Partial<ProductVariation>): Promise<ProductVariation | null> {
        const { data, error } = await supabase
            .from('product_variations')
            .insert([variation])
            .select()
            .single();

        if (error) {
            console.error('Error creating variation:', error);
            throw error;
        }

        return data;
    },

    async updateVariation(id: string, updates: Partial<ProductVariation>): Promise<ProductVariation | null> {
        const { data, error } = await supabase
            .from('product_variations')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating variation:', error);
            throw error;
        }

        return data;
    },

    async deleteVariation(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('product_variations')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting variation:', error);
            return false;
        }

        return true;
    }
};
