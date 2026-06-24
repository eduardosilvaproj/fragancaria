import { supabase } from './supabase';

// =====================================================
// TYPES
// =====================================================

export interface Product {
  id: string;
  sku: string | null;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  stock_quantity: number;
  stock_status: 'in_stock' | 'out_of_stock' | 'low_stock' | 'backorder';
  low_stock_threshold: number;
  track_inventory: boolean;
  brand_id: string | null;
  category_id: string | null;
  meta_title: string | null;
  meta_description: string | null;
  weight_grams: number | null;
  height_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
  is_active: boolean;
  is_featured: boolean;
  is_digital: boolean;
  tags: string[] | null;
  external_id: string | null;
  external_source: string | null;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  brand?: Brand;
  category?: Category;
  images?: ProductImage[];
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string | null;
  name: string;
  price: number | null;
  compare_at_price: number | null;
  stock_quantity: number;
  option_name: string | null;
  option_value: string | null;
  weight_grams: number | null;
  sort_order: number;
  is_active: boolean;
}

export interface ProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Customer {
  id: string;
  auth_user_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
  accepts_marketing: boolean;
  total_orders: number;
  total_spent: number;
  loyalty_points: number;
  loyalty_tier: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
}

export interface Address {
  id: string;
  customer_id: string;
  label: string;
  recipient_name: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default_shipping: boolean;
  is_default_billing: boolean;
}

export interface Order {
  id: string;
  order_number: number;
  customer_id: string | null;
  customer_email: string;
  customer_name: string;
  customer_phone: string | null;
  customer_cpf: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  subtotal: number;
  shipping_cost: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  coupon_id: string | null;
  coupon_code: string | null;
  affiliate_id: string | null;
  affiliate_commission: number;
  shipping_address: ShippingAddress;
  billing_address: ShippingAddress | null;
  payment_method: string | null;
  payment_gateway: string;
  payment_id: string | null;
  payment_details: any;
  paid_at: string | null;
  shipping_method: string | null;
  shipping_carrier: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  envio_facil_quote_id: string | null;
  envio_facil_order_id: string | null;
  shipping_label_url: string | null;
  customer_notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
  // Relacionamentos
  items?: OrderItem[];
  customer?: Customer;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  sku: string | null;
  name: string;
  variant_name: string | null;
  image_url: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  weight_grams: number | null;
}

export interface ShippingAddress {
  recipient_name: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed_amount' | 'free_shipping';
  discount_value: number;
  minimum_order_value: number | null;
  maximum_discount: number | null;
  usage_limit: number | null;
  usage_count: number;
  usage_limit_per_customer: number;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  first_purchase_only: boolean;
}

export type OrderStatus = 'pending' | 'payment_pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type FulfillmentStatus = 'unfulfilled' | 'partial' | 'fulfilled';

// =====================================================
// PRODUCTS SERVICE
// =====================================================

export const productsService = {
  async list(params?: {
    page?: number;
    limit?: number;
    category?: string;
    brand?: string;
    search?: string;
    is_active?: boolean;
    is_featured?: boolean;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }) {
    const {
      page = 1,
      limit = 20,
      category,
      brand,
      search,
      is_active,
      is_featured,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = params || {};

    let query = supabase
      .from('products')
      .select(`
        *,
        brand:brands(*),
        category:categories(*),
        images:product_images(*)
      `, { count: 'exact' });

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active);
    }

    if (is_featured !== undefined) {
      query = query.eq('is_featured', is_featured);
    }

    if (category) {
      query = query.eq('category_id', category);
    }

    if (brand) {
      query = query.eq('brand_id', brand);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(from, to);

    if (error) throw error;

    return {
      products: data as Product[],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        brand:brands(*),
        category:categories(*),
        images:product_images(*),
        variants:product_variants(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Product;
  },

  async getBySlug(slug: string) {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        brand:brands(*),
        category:categories(*),
        images:product_images(*),
        variants:product_variants(*)
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data as Product;
  },

  async create(product: Partial<Product>) {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  },

  async update(id: string, product: Partial<Product>) {
    const { data, error } = await supabase
      .from('products')
      .update(product)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async updateStock(id: string, quantity: number, variantId?: string) {
    if (variantId) {
      const { error } = await supabase
        .from('product_variants')
        .update({ stock_quantity: quantity })
        .eq('id', variantId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('products')
        .update({
          stock_quantity: quantity,
          stock_status: quantity <= 0 ? 'out_of_stock' : quantity <= 5 ? 'low_stock' : 'in_stock'
        })
        .eq('id', id);
      if (error) throw error;
    }
  },

  async addImage(productId: string, imageUrl: string, isPrimary = false) {
    const { data, error } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        url: imageUrl,
        is_primary: isPrimary
      })
      .select()
      .single();

    if (error) throw error;
    return data as ProductImage;
  },

  async bulkImport(products: Partial<Product>[]) {
    const { data, error } = await supabase
      .from('products')
      .insert(products)
      .select();

    if (error) throw error;
    return data as Product[];
  }
};

// =====================================================
// ORDERS SERVICE
// =====================================================

export const ordersService = {
  async list(params?: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    payment_status?: PaymentStatus;
    search?: string;
    date_from?: string;
    date_to?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      status,
      payment_status,
      search,
      date_from,
      date_to
    } = params || {};

    let query = supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*),
        customer:customers(*)
      `, { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (payment_status) {
      query = query.eq('payment_status', payment_status);
    }

    if (search) {
      query = query.or(`order_number.eq.${parseInt(search) || 0},customer_email.ilike.%${search}%,customer_name.ilike.%${search}%`);
    }

    if (date_from) {
      query = query.gte('created_at', date_from);
    }

    if (date_to) {
      query = query.lte('created_at', date_to);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      orders: data as Order[],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*),
        customer:customers(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Order;
  },

  async getByOrderNumber(orderNumber: number) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('order_number', orderNumber)
      .single();

    if (error) throw error;
    return data as Order;
  },

  async create(order: Partial<Order>, items: Partial<OrderItem>[]) {
    // Criar pedido
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert(order)
      .select()
      .single();

    if (orderError) throw orderError;

    // Criar itens
    const itemsWithOrderId = items.map(item => ({
      ...item,
      order_id: orderData.id
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsWithOrderId);

    if (itemsError) throw itemsError;

    // Registrar status inicial
    await supabase
      .from('order_status_history')
      .insert({
        order_id: orderData.id,
        status: 'pending',
        created_by: 'system'
      });

    return orderData as Order;
  },

  async updateStatus(id: string, status: OrderStatus, notes?: string) {
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);

    if (updateError) throw updateError;

    // Registrar no histórico
    const { error: historyError } = await supabase
      .from('order_status_history')
      .insert({
        order_id: id,
        status,
        notes,
        created_by: 'admin'
      });

    if (historyError) throw historyError;
  },

  async updatePaymentStatus(id: string, payment_status: PaymentStatus, payment_id?: string) {
    const updates: any = { payment_status };

    if (payment_status === 'paid') {
      updates.paid_at = new Date().toISOString();
      updates.status = 'processing';
    }

    if (payment_id) {
      updates.payment_id = payment_id;
    }

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async updateShipping(id: string, data: {
    tracking_code?: string;
    tracking_url?: string;
    shipping_carrier?: string;
    shipped_at?: string;
    shipping_label_url?: string;
  }) {
    const updates: any = { ...data };

    if (data.tracking_code && !data.shipped_at) {
      updates.shipped_at = new Date().toISOString();
      updates.fulfillment_status = 'fulfilled';
      updates.status = 'shipped';
    }

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async cancel(id: string, reason: string) {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason
      })
      .eq('id', id);

    if (error) throw error;

    // Registrar no histórico
    await supabase
      .from('order_status_history')
      .insert({
        order_id: id,
        status: 'cancelled',
        notes: reason,
        created_by: 'admin'
      });
  },

  async getStatusHistory(orderId: string) {
    const { data, error } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }
};

// =====================================================
// CUSTOMERS SERVICE
// =====================================================

export const customersService = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    loyalty_tier?: string;
  }) {
    const { page = 1, limit = 20, search, loyalty_tier } = params || {};

    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,cpf.ilike.%${search}%`);
    }

    if (loyalty_tier) {
      query = query.eq('loyalty_tier', loyalty_tier);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      customers: data as Customer[],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        addresses(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Customer & { addresses: Address[] };
  },

  async getByEmail(email: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as Customer | null;
  },

  async create(customer: Partial<Customer>) {
    const { data, error } = await supabase
      .from('customers')
      .insert(customer)
      .select()
      .single();

    if (error) throw error;
    return data as Customer;
  },

  async update(id: string, customer: Partial<Customer>) {
    const { data, error } = await supabase
      .from('customers')
      .update(customer)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Customer;
  },

  async addAddress(customerId: string, address: Partial<Address>) {
    const { data, error } = await supabase
      .from('addresses')
      .insert({ ...address, customer_id: customerId })
      .select()
      .single();

    if (error) throw error;
    return data as Address;
  }
};

// =====================================================
// COUPONS SERVICE
// =====================================================

export const couponsService = {
  async list() {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Coupon[];
  },

  async getByCode(code: string) {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as Coupon | null;
  },

  async validate(code: string, orderTotal: number, customerEmail?: string) {
    const coupon = await this.getByCode(code);

    if (!coupon) {
      return { valid: false, error: 'Cupom não encontrado' };
    }

    // Verificar validade
    const now = new Date();
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      return { valid: false, error: 'Cupom expirado' };
    }

    if (new Date(coupon.starts_at) > now) {
      return { valid: false, error: 'Cupom ainda não está ativo' };
    }

    // Verificar limite de uso
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return { valid: false, error: 'Cupom esgotado' };
    }

    // Verificar valor mínimo
    if (coupon.minimum_order_value && orderTotal < coupon.minimum_order_value) {
      return {
        valid: false,
        error: `Valor mínimo de R$ ${coupon.minimum_order_value.toFixed(2)}`
      };
    }

    // Verificar uso por cliente
    if (customerEmail && coupon.usage_limit_per_customer) {
      const { count } = await supabase
        .from('coupon_usages')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('customer_email', customerEmail);

      if (count && count >= coupon.usage_limit_per_customer) {
        return { valid: false, error: 'Você já usou este cupom' };
      }
    }

    // Verificar primeira compra
    if (coupon.first_purchase_only && customerEmail) {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('customer_email', customerEmail)
        .eq('payment_status', 'paid');

      if (count && count > 0) {
        return { valid: false, error: 'Cupom válido apenas para primeira compra' };
      }
    }

    // Calcular desconto
    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = orderTotal * (coupon.discount_value / 100);
      if (coupon.maximum_discount) {
        discount = Math.min(discount, coupon.maximum_discount);
      }
    } else if (coupon.discount_type === 'fixed_amount') {
      discount = coupon.discount_value;
    }

    return {
      valid: true,
      coupon,
      discount,
      freeShipping: coupon.discount_type === 'free_shipping'
    };
  },

  async create(coupon: Partial<Coupon>) {
    const { data, error } = await supabase
      .from('coupons')
      .insert({ ...coupon, code: coupon.code?.toUpperCase() })
      .select()
      .single();

    if (error) throw error;
    return data as Coupon;
  },

  async update(id: string, coupon: Partial<Coupon>) {
    const { data, error } = await supabase
      .from('coupons')
      .update(coupon)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Coupon;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// =====================================================
// BRANDS SERVICE
// =====================================================

export const brandsService = {
  async list() {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data as Brand[];
  },

  async create(brand: Partial<Brand>) {
    const { data, error } = await supabase
      .from('brands')
      .insert(brand)
      .select()
      .single();

    if (error) throw error;
    return data as Brand;
  },

  async update(id: string, brand: Partial<Brand>) {
    const { data, error } = await supabase
      .from('brands')
      .update(brand)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Brand;
  }
};

// =====================================================
// CATEGORIES SERVICE
// =====================================================

export const categoriesService = {
  async list() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;
    return data as Category[];
  },

  async getTree() {
    const categories = await this.list();

    // Montar árvore hierárquica
    const tree: (Category & { children: Category[] })[] = [];
    const map = new Map<string, Category & { children: Category[] }>();

    categories.forEach(cat => {
      map.set(cat.id, { ...cat, children: [] });
    });

    categories.forEach(cat => {
      const node = map.get(cat.id)!;
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id)!.children.push(node);
      } else {
        tree.push(node);
      }
    });

    return tree;
  },

  async create(category: Partial<Category>) {
    const { data, error } = await supabase
      .from('categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  },

  async update(id: string, category: Partial<Category>) {
    const { data, error } = await supabase
      .from('categories')
      .update(category)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  }
};

// =====================================================
// ANALYTICS SERVICE
// =====================================================

export const analyticsService = {
  async getDashboardStats(period: 'today' | 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
    }

    const { data: orders } = await supabase
      .from('orders')
      .select('total, status, payment_status, created_at')
      .gte('created_at', startDate.toISOString())
      .eq('payment_status', 'paid');

    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    const { count: newCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    const totalRevenue = orders?.reduce((sum, o) => sum + o.total, 0) || 0;
    const totalOrders = orders?.length || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      totalCustomers: totalCustomers || 0,
      newCustomers: newCustomers || 0
    };
  }
};
