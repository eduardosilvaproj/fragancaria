// Ferramentas administrativas de leitura para a Fran (exclusivas para sócios/admins via WhatsApp)

export async function adminGetOrderDetails(db: any, orderId: string): Promise<any> {
  const cleanId = orderId.trim();

  // Tenta buscar por ID exato ou order_number
  let query = db.from("orders").select("*");

  if (cleanId.toUpperCase().startsWith("ORD-")) {
    query = query.or(`id.eq.${cleanId},order_number.eq.${cleanId}`);
  } else {
    query = query.or(`id.eq.${cleanId},order_number.ilike.%${cleanId}%`);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return { error: `Erro ao buscar pedido: ${error.message}` };
  }

  if (!data) {
    return { error: `Pedido '${cleanId}' não encontrado.` };
  }

  return {
    id: data.id,
    orderNumber: data.order_number,
    status: data.status,
    paymentStatus: data.payment_status,
    paymentMethod: data.payment_method,
    total: data.total,
    subtotal: data.subtotal,
    discount: data.discount,
    shippingPrice: data.shipping_price,
    customerName: data.customer_name,
    customerEmail: data.customer_email,
    customerPhone: data.customer_phone,
    customerCpf: data.customer_cpf,
    trackingCode: data.tracking_code,
    trackingToken: data.tracking_token,
    createdAt: data.created_at,
    items: data.items,
    shippingAddress: data.shipping_address,
  };
}

export async function adminGetInventory(db: any, queryStr: string): Promise<any> {
  const q = (queryStr || "").trim();

  let query = db.from("products").select("id, name, brand, price, cost, target_margin, in_stock, quantity, ncm, ean_barcode, is_active");

  if (q) {
    query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%,id.eq.${q}`);
  }

  const { data, error } = await query.limit(10);

  if (error) {
    return { error: `Erro ao consultar inventário: ${error.message}` };
  }

  if (!data || data.length === 0) {
    return { error: `Nenhum produto encontrado para '${q}'.` };
  }

  return data.map((p: any) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    price: p.price,
    cost: p.cost,
    targetMargin: p.target_margin,
    inStock: p.in_stock,
    quantity: p.quantity,
    ncm: p.ncm,
    ean: p.ean_barcode,
    isActive: p.is_active,
  }));
}
