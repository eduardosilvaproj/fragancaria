const fs = require('fs');
const path = require('path');

// Ler CSV do MightyMerge
const csvPath = 'C:\\Users\\eduar\\Downloads\\mightymerge.io__0vnmsrqh.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV - pular linhas de comentário
const lines = csvContent.split('\n').filter(line => !line.startsWith('#') && line.trim());
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

function parsePrice(priceStr) {
  if (!priceStr) return 0;
  return parseFloat(priceStr.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}

// Mapa de normalização de marcas
const BRAND_MAP = {
  "loreal": "L'Oréal",
  "l'oreal": "L'Oréal",
  "l'oréal": "L'Oréal",
  "loréal": "L'Oréal",
  "wella": "Wella",
  "schwarzkopf": "Schwarzkopf",
  "kerastase": "Kérastase",
  "kérastase": "Kérastase",
  "truss": "Truss",
  "lowell": "Lowell",
  "alfaparf": "Alfaparf",
  "keune": "Keune",
  "bruna tavares": "Bruna Tavares",
  "itallian": "Itallian",
  "trivitt": "Itallian", // Trivitt é marca da Itallian
  "sebastian": "Sebastian",
  "cadiveu": "Cadiveu",
  "inoar": "Inoar",
  "redken": "Redken",
  "nioxin": "Nioxin",
  "joico": "Joico",
  "moroccanoil": "Moroccanoil",
  "amend": "Amend",
  "charming": "Charming",
  "laevia": "Laevia",
  "jacques janine": "Jacques Janine",
  "felps": "Felps",
  "osis": "Schwarzkopf", // Osis+ é linha da Schwarzkopf
  "blondme": "Schwarzkopf",
  "igora": "Schwarzkopf",
  "bc bonacure": "Schwarzkopf",
  "serie expert": "L'Oréal",
  "absolut repair": "L'Oréal",
  "vitamino": "L'Oréal",
  "metal detox": "L'Oréal",
  "curl expression": "L'Oréal",
  "pro longer": "L'Oréal",
  "inoa": "L'Oréal",
  "invigo": "Wella",
  "fusion": "Wella",
  "color motion": "Wella",
  "koleston": "Wella",
  "eimi": "Wella",
  "elements": "Wella",
  "sp": "Wella",
  "oil reflections": "Wella",
  "nutri enrich": "Wella",
  "color brilliance": "Wella",
  "semi di lino": "Alfaparf",
  "evolution": "Alfaparf",
  "alta moda": "Alfaparf",
  "care": "Keune",
  "so pure": "Keune",
  "blend": "Keune",
  "1922": "Keune",
  "style": "Keune",
  "design": "Keune",
  "bt skin": "Bruna Tavares",
  "bt coca": "Bruna Tavares",
  "bt vinyl": "Bruna Tavares",
  "cacho mágico": "Lowell",
  "cacho magico": "Lowell",
  "mirtilo": "Lowell",
  "bioplastia": "Lowell",
  "realce": "Lowell",
  "restore": "Cadiveu",
  "nutri amazonia": "Cadiveu",
  "plastica": "Cadiveu",
};

function extractBrand(title) {
  const titleLower = title.toLowerCase();

  // Primeiro, tenta encontrar uma marca conhecida
  for (const [key, brand] of Object.entries(BRAND_MAP)) {
    if (titleLower.includes(key)) {
      return brand;
    }
  }

  return '';
}

// Mapa de categorias mais abrangente
function extractCategory(title) {
  const titleLower = title.toLowerCase();

  // Coloração e relacionados
  if (titleLower.includes('coloração') ||
      titleLower.includes('tintura') ||
      titleLower.includes('tinta') ||
      titleLower.includes('koleston') ||
      titleLower.includes('inoa') ||
      titleLower.includes('igora') ||
      titleLower.includes('evolution color') ||
      titleLower.includes('majirel') ||
      titleLower.includes('color perfect')) {
    return 'Coloração';
  }

  // Água Oxigenada / Oxidante
  if (titleLower.includes('água oxigenada') ||
      titleLower.includes('oxigenada') ||
      titleLower.includes('revelador') ||
      titleLower.includes('developer') ||
      titleLower.includes('oxidante') ||
      titleLower.includes('ox ') ||
      titleLower.includes(' ox') ||
      titleLower.match(/\d+\s*vol/)) {
    return 'Oxidante';
  }

  // Shampoo
  if (titleLower.includes('shampoo') || titleLower.includes('xampu')) {
    return 'Shampoo';
  }

  // Condicionador
  if (titleLower.includes('condicionador')) {
    return 'Condicionador';
  }

  // Máscara
  if (titleLower.includes('máscara') || titleLower.includes('mascara') || titleLower.includes('masque')) {
    return 'Máscara';
  }

  // Leave-in
  if (titleLower.includes('leave-in') || titleLower.includes('leave in') || titleLower.includes('leavein')) {
    return 'Leave-in';
  }

  // Óleo
  if (titleLower.includes('óleo') || titleLower.includes('oleo') || titleLower.includes(' oil')) {
    return 'Óleo';
  }

  // Finalizadores
  if (titleLower.includes('finalizador') ||
      titleLower.includes('mousse') ||
      titleLower.includes('spray') ||
      titleLower.includes('pasta modeladora') ||
      titleLower.includes('pomada') ||
      titleLower.includes('gel ') ||
      titleLower.includes('cera ') ||
      titleLower.includes('modelador') ||
      titleLower.includes('definidor') ||
      titleLower.includes('gelatina')) {
    return 'Finalizador';
  }

  // Tratamento / Ampolas / Serum
  if (titleLower.includes('tratamento') ||
      titleLower.includes('ampola') ||
      titleLower.includes('serum') ||
      titleLower.includes('sérum') ||
      titleLower.includes('reparador') ||
      titleLower.includes('reconstrutor') ||
      titleLower.includes('booster')) {
    return 'Tratamento';
  }

  // Proteção Térmica
  if (titleLower.includes('protetor') ||
      titleLower.includes('proteção') ||
      titleLower.includes('protecao') ||
      titleLower.includes('thermal') ||
      titleLower.includes('termic')) {
    return 'Proteção Térmica';
  }

  // Creme
  if (titleLower.includes('creme') || titleLower.includes('cream')) {
    return 'Creme';
  }

  // Maquiagem
  if (titleLower.includes('base líquida') ||
      titleLower.includes('base liquida') ||
      titleLower.includes('batom') ||
      titleLower.includes('blush') ||
      titleLower.includes('pó facial') ||
      titleLower.includes('po facial') ||
      titleLower.includes('pó solto') ||
      titleLower.includes('po solto') ||
      titleLower.includes('balm labial') ||
      titleLower.includes('gloss') ||
      titleLower.includes('lip') ||
      titleLower.includes('skinpowder') ||
      titleLower.includes('bt skin') ||
      titleLower.includes('maquiagem')) {
    return 'Maquiagem';
  }

  // Kit
  if (titleLower.includes('kit ') || titleLower.startsWith('kit')) {
    return 'Kit';
  }

  // Descolorante / Pó Descolorante
  if (titleLower.includes('descolorante') ||
      titleLower.includes('pó descolorante') ||
      titleLower.includes('po descolorante') ||
      titleLower.includes('blondor') ||
      titleLower.includes('blondme')) {
    return 'Descolorante';
  }

  return 'Outros';
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Espaços para hífens
    .replace(/-+/g, '-') // Remove hífens duplicados
    .substring(0, 80); // Limita tamanho
}

const products = [];
const seenIds = new Set();

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;

  const values = parseCSVLine(lines[i]);

  const itemId = values[getHeaderIndex('item_id')] || '';
  const title = values[getHeaderIndex('titulo')] || '';
  const priceStr = values[getHeaderIndex('preco')] || '0';
  const originalPriceStr = values[getHeaderIndex('preco_original')] || '';
  const image = values[getHeaderIndex('imagem')] || '';

  if (!itemId || !title || seenIds.has(itemId)) continue;
  seenIds.add(itemId);

  const price = parsePrice(priceStr);
  const originalPrice = parsePrice(originalPriceStr);
  const category = extractCategory(title);
  const brand = extractBrand(title);

  // Gerar slug único
  let slug = generateSlug(title);
  let counter = 1;
  let uniqueSlug = slug;
  while (products.some(p => p.id === uniqueSlug)) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  products.push({
    id: uniqueSlug,
    sku: itemId,
    name: title,
    description: title,
    brand: brand,
    category: category,
    tags: [category.toLowerCase(), brand ? brand.toLowerCase() : null, 'ml-import'].filter(Boolean),
    price: price,
    originalPrice: originalPrice > price ? originalPrice : null,
    images: [image].filter(Boolean),
    stock: 10,
    isActive: true
  });
}

// Gerar TypeScript
const tsContent = `// Produtos importados do MightyMerge (Mercado Livre) - ${new Date().toISOString().split('T')[0]}
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

// Estatísticas
const cats = {};
const brandCounts = {};
products.forEach(p => {
  cats[p.category] = (cats[p.category] || 0) + 1;
  if (p.brand) brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
});

console.log('=== Importação MightyMerge v2 ===');
console.log('Total de produtos:', products.length);
console.log('\n--- Categorias ---');
Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${v.toString().padStart(3)} ${k}`));
console.log('\n--- Marcas ---');
Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${v.toString().padStart(3)} ${k}`));
console.log('\n--- Sem marca ---');
console.log(' ', products.filter(p => !p.brand).length, 'produtos');
console.log('\nArquivo salvo em:', outputPath);
