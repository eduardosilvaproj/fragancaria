#!/usr/bin/env node
// scripts/clean-test-orders.mjs
// Deleta pedidos de teste antigos e seus shipping_quotes
// Uso: node --env-file=.env scripts/clean-test-orders.mjs

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

const main = async () => {
  // IDs parciais fornecidos pelo usuário
  const partialIds = ['FC16ED26', 'CFC1D8B5'];

  // Buscar todos os pedidos
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, status, customer_name, total, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) { console.error('Erro ao buscar pedidos:', error.message); process.exit(1); }

  // Filtrar pelos parciais
  const toDelete = orders.filter(function(o) {
    return partialIds.some(function(pid) { return o.id.toUpperCase().startsWith(pid); });
  });

  if (toDelete.length === 0) {
    console.log('Nenhum pedido de teste encontrado com esses IDs.');
    console.log('Pedidos recentes:');
    orders.slice(0, 5).forEach(function(o) {
      console.log('  ' + o.id.slice(0, 8).toUpperCase() + ' | ' + o.status + ' | ' + (o.customer_name || 'N/A') + ' | R$ ' + o.total);
    });
    process.exit(0);
  }

  console.log('Deletando ' + toDelete.length + ' pedido(s):');
  for (const o of toDelete) {
    console.log('  ' + o.id.slice(0, 8).toUpperCase() + ' | ' + o.status + ' | ' + (o.customer_name || 'N/A'));

    // Deletar shipping_quotes vinculados
    const { error: sqErr } = await supabase
      .from('shipping_quotes')
      .delete()
      .eq('order_id', o.id);
    if (sqErr) console.error('  Erro ao deletar shipping_quote: ' + sqErr.message);

    // Deletar o pedido
    const { error: oErr } = await supabase
      .from('orders')
      .delete()
      .eq('id', o.id);
    if (oErr) console.error('  Erro ao deletar pedido: ' + oErr.message);
  }

  console.log('\nPedidos deletados. Agora rode:');
  console.log('  node --env-file=.env scripts/seed-test-order.mjs');
};

main();