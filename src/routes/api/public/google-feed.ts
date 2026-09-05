import { createFileRoute } from "@tanstack/react-router"
import type { Database } from "@/integrations/supabase/types"

function escapeXml(str: string): string {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

export const Route = createFileRoute("/api/public/google-feed")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server")

        const { data: products, error } = await supabaseAdmin
          .from("products")
          .select("*")

        if (error) {
          const err = error as { message?: string }
          return new Response(err?.message || "Erro ao buscar produtos", {
            status: 500,
            headers: { "Content-Type": "application/xml; charset=utf-8" }
          })
        }

        let xml = '<?xml version="1.0" encoding="UTF-8"?>'
        xml += '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">'
        xml += '<channel>'
        xml += '<title>Fragranciaria</title>'
        xml += '<link>https://www.fragranciaria.com</link>'
        xml += '<description>Produtos profissionais para cabelo</description>'

        for (const product of products ?? []) {
          if (!product.images || product.images.length === 0) continue

          const gtin = product.ean_barcode && /^\d{8,14}$/.test(product.ean_barcode) ? product.ean_barcode : null

          xml += '<item>'
          xml += '<g:id>' + escapeXml(product.id || '') + '</g:id>'
          xml += '<g:title>' + escapeXml((product.name || '').substring(0, 150)) + '</g:title>'
          xml += '<g:description>' + escapeXml((product.description || '').replace(/<[^>]*>/g, '')) + '</g:description>'
          xml += '<g:link>https://www.fragranciaria.com/produto/' + escapeXml(product.slug || '') + '</g:link>'
          xml += '<g:image_link>' + escapeXml(product.images[0] || '') + '</g:image_link>'
          xml += '<g:availability>' + (product.in_stock ? 'in_stock' : 'out_of_stock') + '</g:availability>'

          // CORREÇÃO DE NEGÓCIO: g:price usa o preço promocional (original_price)
          // se houver, senão usa o price normal. g:sale_price é o preço normal.
          const priceDisplay = (product.original_price && product.original_price > product.price)
            ? product.original_price
            : product.price
          const salePriceDisplay = (product.original_price && product.original_price > product.price)
            ? product.price
            : null

          xml += '<g:price>' + priceDisplay.toFixed(2) + ' BRL</g:price>'
          if (salePriceDisplay !== null) {
            xml += '<g:sale_price>' + salePriceDisplay.toFixed(2) + ' BRL</g:sale_price>'
          }
          xml += '<g:brand>' + escapeXml(product.brand || '') + '</g:brand>'
          xml += '<g:condition>new</g:condition>'
          if (gtin) {
            xml += '<g:gtin>' + gtin + '</g:gtin>'
          } else {
            xml += '<g:identifier_exists>false</g:identifier_exists>'
          }
          xml += '</item>'
        }

        xml += '</channel>'
        xml += '</rss>'

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600"
          }
        })
      },
    },
  },
})