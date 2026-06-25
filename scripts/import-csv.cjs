const fs = require('fs');
const path = require('path');

// Ler CSV
const csvPath = 'C:\\Users\\eduar\\Downloads\\products_export.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV
const lines = csvContent.split('\n');
const headers = parseCSVLine(lines[0]);

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function getHeaderIndex(name) {
  return headers.findIndex(h => h.trim().toLowerCase() === name.toLowerCase());
}

const products = [];

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;

  const values = parseCSVLine(lines[i]);

  const handle = values[getHeaderIndex('Handle')] || '';
  const title = values[getHeaderIndex('Title')] || '';
  const body = values[getHeaderIndex('Body (HTML)')] || '';
  const vendor = values[getHeaderIndex('Vendor')] || '';
  const type = values[getHeaderIndex('Type')] || '';
  const tags = values[getHeaderIndex('Tags')] || '';
  const price = parseFloat(values[getHeaderIndex('Variant Price')] || '0');
  const comparePrice = parseFloat(values[getHeaderIndex('Variant Compare At Price')] || '0') || null;
  const sku = values[getHeaderIndex('Variant SKU')] || '';
  const stock = parseInt(values[getHeaderIndex('Variant Inventory Qty')] || '0');
  const image = values[getHeaderIndex('Image Src')] || '';
  const status = values[getHeaderIndex('Status')] || 'active';

  if (!handle || !title) continue;

  products.push({
    id: handle,
    sku: sku,
    name: title,
    description: body.replace(/<[^>]*>/g, ''),
    brand: vendor,
    category: type || 'Outros',
    tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    price: price,
    originalPrice: comparePrice,
    images: [image].filter(Boolean),
    stock: stock,
    isActive: status === 'active'
  });
}

// Gerar TypeScript
const tsContent = `// Produtos importados do Shopify - ${new Date().toISOString().split('T')[0]}
// Total: ${products.length} produtos

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  tags: string[];
  price: number;
  originalPrice?: number | null;
  images: string[];
  stock: number;
  isActive: boolean;
}

export const PRODUCTS: Product[] = ${JSON.stringify(products, null, 2)};

export const BRANDS = [...new Set(PRODUCTS.map(p => p.brand))].filter(Boolean).sort();
export const CATEGORIES = [...new Set(PRODUCTS.map(p => p.category))].filter(Boolean).sort();
`;

const outputPath = path.join(__dirname, '..', 'src', 'data', 'products.ts');
fs.writeFileSync(outputPath, tsContent, 'utf-8');

console.log('Importados', products.length, 'produtos');
console.log('Arquivo salvo em:', outputPath);
