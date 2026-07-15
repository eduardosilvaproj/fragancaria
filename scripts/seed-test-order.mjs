#!/usr/bin/env node
// =============================================================
// scripts/seed-test-order.mjs
// Insere um pedido de teste em public.orders para testar emissão
// de NF-e (notaas) e geração de etiqueta. Usa um produto real do
// catálogo. Status 'approved' para habilitar NF-e e etiqueta.
//
// Uso:
//   node --env-file=.env scripts/seed-test-order.mjs
// =============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

function trackingToken() {
  const alphabet = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
  let out = '';
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

const main = async () => {
  // 1) pega 1 produto ativo real
  const { data: prods, error: prodErr } = await supabase
    .from('products')
    .select('id, name, price, images')
    .eq('is_active', true)
    .gt('price', 0)
    .limit(1);

  if (prodErr) { console.error('Erro ao buscar produto:', prodErr.message); process.exit(1); }
  if (!prods || prods.length === 0) { console.error('Nenhum produto ativo encontrado'); process.exit(1); }

  const prod = prods[0];
  const qty = 1;
  const unit = Number(prod.price);
  const subtotal = Number((unit * qty).toFixed(2));
  const shipping = 0;
  const total = Number((subtotal + shipping).toFixed(2));

  const items = [{
    id: prod.id,
    title: prod.name,
    quantity: qty,
    price: unit,
    image: Array.isArray(prod.images) ? prod.images[0] : null,
  }];

  // 2) insere o pedido
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'pix',
      payment_id: `TEST-${Date.now()}`,
      subtotal,
      discount: 0,
      shipping_price: 0,
      total,
      amount: total,
      items,
      customer_name: 'Mariana Albuquerque',
      customer_email: 'mariana.teste@fragranciaria.com',
      customer_cpf: '11144477735',
      customer_phone: '(21) 99876-5432',
      shipping_method: 'PAC',
      shipping_address: {
        street: 'Rua das Laranjeiras',
        number: '402',
        complement: 'Apto 71',
        neighborhood: 'Laranjeiras',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '22240006',
        cep: '22240006',
      },
      tracking_token: trackingToken(),
    })
    .select('id, tracking_token, total, customer_name')
    .single();

  if (error) { console.error('Erro ao inserir pedido:', error.message); process.exit(1); }

  console.log('Pedido de teste criado:');
  console.log('  id:', order.id);
  console.log('  cliente:', order.customer_name);
  console.log('  total: R$', order.total);
  console.log('  produto:', prod.name, '(R$', unit, ')');
  console.log('  tracking_token:', order.tracking_token);
};

main();
