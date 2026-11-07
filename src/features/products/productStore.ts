import type { SQLiteDatabase } from 'expo-sqlite';
import { nutritionFor, registerFood, type Food } from '../foods/foodDb';
import { updateMeal, type Meal, type MealItem } from '../meals/mealStore';
import { barcodeFromFoodId, fetchProduct, productFoodId, type Product } from './openFoodFacts';

export type ProductLookup =
  | { kind: 'found'; product: Product }
  | { kind: 'not_found' }
  | { kind: 'offline' }; // Open Food Facts couldn't be reached; try again later

// A barcode seen by the camera, and what Open Food Facts said about it
export interface ProductScan {
  barcode: string;
  lookup: ProductLookup;
}

// Products get added to Open Food Facts all the time, so "not found" is only trusted for a day
const NOT_FOUND_TTL_MS = 24 * 60 * 60 * 1000;

interface ProductRow {
  barcode: string;
  found: number;
  name: string | null;
  food_json: string | null;
  fetched_at: number;
}

const toProduct = (row: ProductRow): Product => ({
  barcode: row.barcode,
  name: row.name ?? `Packaged food ${row.barcode}`,
  food: row.food_json ? (JSON.parse(row.food_json) as Food) : null,
});

// Barcodes on Indian packs are EAN-13; UPC-A is the same number without the leading 0
export const normalizeBarcode = (data: string) => {
  const digits = data.replace(/\D/g, '');
  return digits.length === 12 ? `0${digits}` : digits;
};

// A placeholder name for a product scanned while offline
export const pendingProductName = (barcode: string) => `Packaged food · ${barcode}`;

// Makes every cached product resolvable through getFood(), for saved meals and edits.
export const loadProducts = async (db: SQLiteDatabase) => {
  const rows = await db.getAllAsync<ProductRow>('SELECT * FROM products WHERE food_json IS NOT NULL');
  for (const row of rows) registerFood(toProduct(row).food!);
};

const cachedLookup = async (db: SQLiteDatabase, barcode: string): Promise<ProductLookup | null> => {
  const row = await db.getFirstAsync<ProductRow>('SELECT * FROM products WHERE barcode = ?', barcode);
  if (!row) return null;
  if (row.found) return { kind: 'found', product: toProduct(row) };
  return Date.now() - row.fetched_at < NOT_FOUND_TTL_MS ? { kind: 'not_found' } : null;
};

export const lookupProduct = async (db: SQLiteDatabase, barcode: string): Promise<ProductLookup> => {
  const cached = await cachedLookup(db, barcode);
  if (cached) return cached;

  let product: Product | null;
  try {
    product = await fetchProduct(barcode);
  } catch (error) {
    console.info('Open Food Facts unavailable:', error instanceof Error ? error.message : error);
    return { kind: 'offline' };
  }

  await db.runAsync(
    'INSERT OR REPLACE INTO products (barcode, found, name, food_json, fetched_at) VALUES (?, ?, ?, ?, ?)',
    [barcode, product ? 1 : 0, product?.name ?? null, product?.food ? JSON.stringify(product.food) : null, Date.now()]
  );
  if (!product) return { kind: 'not_found' };
  if (product.food) registerFood(product.food);
  return { kind: 'found', product };
};

// The plate item for a product: with a pack portion and nutrition when Open Food Facts has
// them, else a named tag. The barcode stays in dishId either way.
export const productItem = (product: Product, quantity = 1): MealItem => {
  const grams = product.food ? product.food.portionGrams * quantity : null;
  return {
    dishId: productFoodId(product.barcode),
    name: product.name,
    quantity: product.food ? quantity : null,
    grams,
    nutrition: product.food && grams ? nutritionFor(product.food, grams) : null,
    recognizedConfidence: null,
  };
};

const isPending = (item: MealItem) =>
  item.nutrition === null && item.name === pendingProductName(barcodeFromFoodId(item.dishId) ?? '');

// Fills in products that were scanned while offline. Returns the meals it updated.
export const resolvePendingProducts = async (db: SQLiteDatabase, meals: Meal[]): Promise<Meal[]> => {
  const updated: Meal[] = [];
  for (const meal of meals) {
    if (!meal.items.some(isPending)) continue;

    let changed = false;
    const items: MealItem[] = [];
    for (const item of meal.items) {
      const barcode = isPending(item) ? barcodeFromFoodId(item.dishId) : null;
      const lookup = barcode ? await lookupProduct(db, barcode) : null;
      if (lookup?.kind === 'offline') return updated; // still offline; try again next launch
      if (lookup?.kind === 'found') {
        items.push(productItem(lookup.product, item.quantity ?? 1));
        changed = true;
      } else {
        items.push(item);
      }
    }
    if (changed) updated.push(await updateMeal(db, meal, { ...meal, items }));
  }
  return updated;
};
