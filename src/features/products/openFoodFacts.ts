import type { Diet, Food, Nutrition } from '../foods/foodDb';

// Packaged food comes from Open Food Facts (https://world.openfoodfacts.org), a free,
// crowd-sourced product database (data under ODbL). Only the barcode is sent.
const API = 'https://world.openfoodfacts.org/api/v2/product';
const FIELDS = [
  'product_name',
  'product_name_en',
  'brands',
  'quantity',
  'product_quantity',
  'product_quantity_unit',
  'serving_quantity',
  'labels_tags',
  'nutriments',
].join(',');
// Open Food Facts asks API clients to identify themselves
const USER_AGENT = 'Mesa/0.1 (personal food journal; https://github.com/Developerr86/Mesa)';
const TIMEOUT_MS = 8000;

// Packs up to this size are eaten as packs ("1 pack of chips"); bigger ones (a 1 kg bag
// of namkeen) are logged by serving.
const MAX_PACK_GRAMS = 250;

export interface Product {
  barcode: string;
  name: string;
  // null when Open Food Facts has the product but no nutrition for it
  food: Food | null;
}

interface OffProduct {
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  quantity?: string;
  product_quantity?: number | string;
  product_quantity_unit?: string;
  serving_quantity?: number | string;
  labels_tags?: string[];
  nutriments?: Record<string, number | string | undefined>;
}

export const productFoodId = (barcode: string) => `off:${barcode}`;

export const barcodeFromFoodId = (id: string | null) => (id?.startsWith('off:') ? id.slice(4) : null);

const toNumber = (value: unknown) => {
  const number = typeof value === 'string' ? Number.parseFloat(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? number : null;
};

const per100g = (nutriments: OffProduct['nutriments'] = {}): Nutrition | null => {
  const get = (key: string) => toNumber(nutriments[`${key}_100g`]);
  // Energy is sometimes only given in kJ
  const kcal = get('energy-kcal') ?? (get('energy') !== null ? get('energy')! / 4.184 : null);
  if (kcal === null) return null;
  const sodium = get('sodium') ?? (get('salt') !== null ? get('salt')! / 2.5 : 0);
  return {
    kcal,
    protein_g: get('proteins') ?? 0,
    carbs_g: get('carbohydrates') ?? 0,
    fat_g: get('fat') ?? 0,
    fiber_g: get('fiber') ?? 0,
    sugars_g: get('sugars') ?? 0,
    sodium_mg: sodium * 1000,
  };
};

// Indian packs carry the green (veg) or brown (non-veg) mark, which Open Food Facts records as labels
const dietFromLabels = (labels: string[] = []): Diet | null => {
  if (labels.includes('en:non-vegetarian')) return 'non_veg';
  if (labels.includes('en:vegetarian') || labels.includes('en:vegan')) return 'veg';
  return null;
};

const letters = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

// "Haldiram's" + "Bhujia" -> "Haldiram's Bhujia", but "Lay's" + "Lays Magic Masala" stays as is
const productName = (product: OffProduct) => {
  const name = (product.product_name_en || product.product_name || '').trim();
  const brand = product.brands?.split(',')[0].trim() ?? '';
  if (!name) return brand || null;
  return brand && !letters(name).includes(letters(brand)) ? `${brand} ${name}` : name;
};

export const toProduct = (barcode: string, product: OffProduct): Product => {
  const name = productName(product) ?? `Packaged food ${barcode}`;
  const nutrition = per100g(product.nutriments);
  if (!nutrition) return { barcode, name, food: null };

  // Millilitres are counted as grams; close enough for drinks
  const unit = product.product_quantity_unit?.toLowerCase();
  const packGrams = unit && unit !== 'g' && unit !== 'ml' ? null : toNumber(product.product_quantity);
  const servingGrams = toNumber(product.serving_quantity);
  const [portionUnit, portionGrams] =
    packGrams && packGrams <= MAX_PACK_GRAMS
      ? ['pack', packGrams]
      : servingGrams
        ? ['serving', servingGrams]
        : ['serving', 100];

  return {
    barcode,
    name,
    food: {
      id: productFoodId(barcode),
      name,
      category: 'packaged',
      cuisine: product.brands?.split(',')[0].trim() ?? '',
      diet: dietFromLabels(product.labels_tags),
      portionUnit,
      portionGrams,
      visualGroup: 'packaged',
      per100g: nutrition,
    },
  };
};

// Resolves to the product, or null when Open Food Facts doesn't know the barcode.
// Rejects when it can't be reached (offline, timeout, server error).
export const fetchProduct = async (barcode: string): Promise<Product | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API}/${encodeURIComponent(barcode)}?fields=${FIELDS}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });
    // An unknown barcode is a 404 with a JSON body
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Open Food Facts returned ${response.status}`);
    const body = (await response.json()) as { status: number; product?: OffProduct };
    return body.status === 1 && body.product ? toProduct(barcode, body.product) : null;
  } finally {
    clearTimeout(timeout);
  }
};
