import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class EcommerceService {
    private sb;
    constructor(private supabase: SupabaseService) { this.sb = this.supabase.getClient(); }

    async getEcommerceProducts(tenantId: string) { return this.sb.from('ecommerce_products').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getEcommerceOrders(tenantId: string) { return this.sb.from('ecommerce_orders').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getEcommerceCustomers(tenantId: string) { return this.sb.from('ecommerce_customers').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getEcommerceOrderItems(tenantId: string) { return this.sb.from('ecommerce_order_items').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getEcommerceCategories(tenantId: string) { return this.sb.from('ecommerce_categories').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getEcommerceReviews(tenantId: string) { return this.sb.from('ecommerce_reviews').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getEcommerceDiscounts(tenantId: string) { return this.sb.from('ecommerce_discounts').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
    async getEcommercePayments(tenantId: string) { return this.sb.from('ecommerce_payments').select('*').eq('tenant_id', tenantId).then((r: any) => r.data || []); }
}