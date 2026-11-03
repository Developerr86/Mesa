import { Directory, File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Nutrition } from '../foods/foodDb';

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type MealSource = 'home' | 'takeout' | 'dine_out';

// One thing on the plate. Items from the food database carry a portion and a nutrition
// snapshot (so later corrections to the reference data never rewrite a logged meal);
// items the user typed themselves are just names — tags without nutrition.
export interface MealItem {
  dishId: string | null;
  name: string;
  quantity: number | null; // multiples of the dish's standard portion
  grams: number | null;
  nutrition: Nutrition | null;
  // Set when the on-device classifier suggested this item, kept to measure and retrain it
  recognizedConfidence: number | null;
}

// Everything the details sheet collects.
export interface MealDetails {
  items: MealItem[];
  mealType: MealType;
  mealSource: MealSource | null;
  cost: number | null;
  place: string | null;
  notes: string | null;
  // The classifier's single best guess for the whole photo
  predictedLabel: string | null;
  predictedDishId: string | null;
  predictedConfidence: number | null;
}

export interface Meal extends MealDetails {
  id: number;
  photoUri: string;
  capturedAt: Date;
  // Derived from items: "Dal, Rice, Roti" and the summed nutrition of database items
  dishName: string | null;
  nutrition: Nutrition | null;
}

const NUTRIENTS = ['kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugars_g', 'sodium_mg'] as const;

export const totalNutrition = (items: MealItem[]): Nutrition | null => {
  const withNutrition = items.filter((item) => item.nutrition);
  if (withNutrition.length === 0) return null;
  const total = Object.fromEntries(NUTRIENTS.map((n) => [n, 0])) as unknown as Nutrition;
  for (const item of withNutrition) {
    for (const n of NUTRIENTS) total[n] += item.nutrition![n];
  }
  return total;
};

export const summarizeItems = (items: MealItem[]) => ({
  dishName: items.length > 0 ? items.map((item) => item.name).join(', ') : null,
  nutrition: totalNutrition(items),
});

type NutritionColumns = { [K in (typeof NUTRIENTS)[number]]: number | null };

// The meals table keeps a summary of its items (joined names, totals) so lists stay cheap.
interface MealRow extends NutritionColumns {
  id: number;
  photo_file: string;
  captured_at: number;
  cost: number | null;
  place: string | null;
  notes: string | null;
  dish_id: string | null;
  dish_name: string | null;
  quantity: number | null;
  grams: number | null;
  meal_type: MealType | null;
  meal_source: MealSource | null;
  predicted_label: string | null;
  predicted_dish_id: string | null;
  predicted_confidence: number | null;
}

interface MealItemRow extends NutritionColumns {
  meal_id: number;
  position: number;
  dish_id: string | null;
  name: string;
  quantity: number | null;
  grams: number | null;
  recognized_confidence: number | null;
}

export const DATABASE_NAME = 'mesa.db';

export const mealTypeForTime = (date: Date): MealType => {
  const hour = date.getHours();
  if (hour >= 4 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 19) return 'snack';
  return 'dinner';
};

// Photos live in the documents directory, which the OS never purges. Only the
// file name is stored, because the absolute app-container path can change
// between installs and updates on iOS.
const photosDirectory = () => new Directory(Paths.document, 'meal-photos');

const nutritionColumns = (nutrition: Nutrition | null): NutritionColumns =>
  Object.fromEntries(NUTRIENTS.map((n) => [n, nutrition ? nutrition[n] : null])) as NutritionColumns;

const nutritionFromColumns = (row: NutritionColumns): Nutrition | null =>
  row.kcal === null ? null : (Object.fromEntries(NUTRIENTS.map((n) => [n, row[n] ?? 0])) as unknown as Nutrition);

const toItem = (row: MealItemRow): MealItem => ({
  dishId: row.dish_id,
  name: row.name,
  quantity: row.quantity,
  grams: row.grams,
  nutrition: nutritionFromColumns(row),
  recognizedConfidence: row.recognized_confidence,
});

const toMeal = (row: MealRow, items: MealItem[]): Meal => ({
  id: row.id,
  photoUri: new File(photosDirectory(), row.photo_file).uri,
  capturedAt: new Date(row.captured_at),
  items,
  ...summarizeItems(items),
  // Meals saved before details existed fall back to the time of day
  mealType: row.meal_type ?? mealTypeForTime(new Date(row.captured_at)),
  mealSource: row.meal_source,
  cost: row.cost,
  place: row.place,
  notes: row.notes,
  predictedLabel: row.predicted_label,
  predictedDishId: row.predicted_dish_id,
  predictedConfidence: row.predicted_confidence,
});

// Each entry upgrades the schema by one version. Steps run in a transaction together
// with the version bump, so an interrupted launch can never leave a half-applied step.
const MIGRATIONS: string[] = [
  // 0 → 1: meals with a photo
  `
    CREATE TABLE meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      photo_file TEXT NOT NULL,
      captured_at INTEGER NOT NULL,
      cost REAL,
      place TEXT,
      notes TEXT
    );
    CREATE INDEX meals_captured_at ON meals (captured_at DESC);
  `,
  // 1 → 2: details sheet fields and a nutrition snapshot
  `
    ALTER TABLE meals ADD COLUMN dish_id TEXT;
    ALTER TABLE meals ADD COLUMN dish_name TEXT;
    ALTER TABLE meals ADD COLUMN quantity REAL;
    ALTER TABLE meals ADD COLUMN grams REAL;
    ALTER TABLE meals ADD COLUMN meal_type TEXT;
    ALTER TABLE meals ADD COLUMN meal_source TEXT;
    ALTER TABLE meals ADD COLUMN kcal REAL;
    ALTER TABLE meals ADD COLUMN protein_g REAL;
    ALTER TABLE meals ADD COLUMN carbs_g REAL;
    ALTER TABLE meals ADD COLUMN fat_g REAL;
    ALTER TABLE meals ADD COLUMN fiber_g REAL;
    ALTER TABLE meals ADD COLUMN sugars_g REAL;
    ALTER TABLE meals ADD COLUMN sodium_mg REAL;
  `,
  // 2 → 3: what the on-device classifier guessed
  `
    ALTER TABLE meals ADD COLUMN predicted_label TEXT;
    ALTER TABLE meals ADD COLUMN predicted_dish_id TEXT;
    ALTER TABLE meals ADD COLUMN predicted_confidence REAL;
  `,
  // 3 → 4: a meal holds several items; existing single-dish meals become one item each
  `
    CREATE TABLE meal_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      dish_id TEXT,
      name TEXT NOT NULL,
      quantity REAL,
      grams REAL,
      kcal REAL,
      protein_g REAL,
      carbs_g REAL,
      fat_g REAL,
      fiber_g REAL,
      sugars_g REAL,
      sodium_mg REAL,
      recognized_confidence REAL
    );
    CREATE INDEX meal_items_meal ON meal_items (meal_id, position);
    INSERT INTO meal_items (meal_id, position, dish_id, name, quantity, grams,
      kcal, protein_g, carbs_g, fat_g, fiber_g, sugars_g, sodium_mg, recognized_confidence)
    SELECT id, 0, dish_id, dish_name, quantity, grams,
      kcal, protein_g, carbs_g, fat_g, fiber_g, sugars_g, sodium_mg,
      CASE WHEN dish_id IS NOT NULL AND dish_id = predicted_dish_id THEN predicted_confidence END
    FROM meals WHERE dish_name IS NOT NULL;
  `,
];

const DATABASE_VERSION = MIGRATIONS.length;

export const migrateDbIfNeeded = async (db: SQLiteDatabase) => {
  // WAL can't be switched on inside a transaction; it's idempotent, so set it every launch
  await db.execAsync(`PRAGMA journal_mode = 'wal';`);

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;

  for (let version = currentVersion; version < DATABASE_VERSION; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
};

export const listMeals = async (db: SQLiteDatabase): Promise<Meal[]> => {
  const rows = await db.getAllAsync<MealRow>('SELECT * FROM meals ORDER BY captured_at DESC');
  const itemRows = await db.getAllAsync<MealItemRow>('SELECT * FROM meal_items ORDER BY meal_id, position');

  const itemsByMeal = new Map<number, MealItem[]>();
  for (const itemRow of itemRows) {
    const items = itemsByMeal.get(itemRow.meal_id) ?? [];
    items.push(toItem(itemRow));
    itemsByMeal.set(itemRow.meal_id, items);
  }
  return rows.map((row) => toMeal(row, itemsByMeal.get(row.id) ?? []));
};

type DetailColumns = Omit<MealRow, 'id' | 'photo_file' | 'captured_at'>;

const detailColumns = (details: MealDetails): DetailColumns => {
  const { dishName, nutrition } = summarizeItems(details.items);
  const single = details.items.length === 1 ? details.items[0] : null;
  return {
    cost: details.cost,
    place: details.place,
    notes: details.notes,
    dish_id: single?.dishId ?? null,
    dish_name: dishName,
    quantity: single?.quantity ?? null,
    grams: single?.grams ?? null,
    meal_type: details.mealType,
    meal_source: details.mealSource,
    ...nutritionColumns(nutrition),
    predicted_label: details.predictedLabel,
    predicted_dish_id: details.predictedDishId,
    predicted_confidence: details.predictedConfidence,
  };
};

const insertItems = async (db: SQLiteDatabase, mealId: number, items: MealItem[]) => {
  for (const [position, item] of items.entries()) {
    const row: MealItemRow = {
      meal_id: mealId,
      position,
      dish_id: item.dishId,
      name: item.name,
      quantity: item.quantity,
      grams: item.grams,
      ...nutritionColumns(item.nutrition),
      recognized_confidence: item.recognizedConfidence,
    };
    const columns = Object.keys(row);
    await db.runAsync(
      `INSERT INTO meal_items (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      Object.values(row)
    );
  }
};

// Copies the captured photo out of the cache into permanent storage, then records the meal.
export const saveMeal = async (
  db: SQLiteDatabase,
  capturedPhotoUri: string,
  details: MealDetails,
  takenAt: Date
): Promise<Meal> => {
  const capturedAt = takenAt.getTime();
  const source = new File(capturedPhotoUri);
  const extension = source.extension || '.jpg';
  const photoFile = `meal-${capturedAt}${extension}`;

  const directory = photosDirectory();
  directory.create({ intermediates: true, idempotent: true });
  const destination = new File(directory, photoFile);
  await source.copy(destination);

  try {
    const row: Omit<MealRow, 'id'> = { photo_file: photoFile, captured_at: capturedAt, ...detailColumns(details) };
    const columns = Object.keys(row);
    let mealId = 0;
    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        `INSERT INTO meals (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
        Object.values(row)
      );
      mealId = result.lastInsertRowId;
      await insertItems(db, mealId, details.items);
    });

    return toMeal({ id: mealId, ...row }, details.items);
  } catch (error) {
    // Don't leave an orphaned photo behind if the meal couldn't be written
    destination.delete();
    throw error;
  }
};

// Rewrites everything the details sheet edits; the photo and capture time never change.
export const updateMeal = async (db: SQLiteDatabase, meal: Meal, details: MealDetails): Promise<Meal> => {
  const columns = detailColumns(details);
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE meals SET ${Object.keys(columns)
        .map((column) => `${column} = ?`)
        .join(', ')} WHERE id = ?`,
      [...Object.values(columns), meal.id]
    );
    await db.runAsync('DELETE FROM meal_items WHERE meal_id = ?', meal.id);
    await insertItems(db, meal.id, details.items);
  });
  return { ...meal, ...details, ...summarizeItems(details.items) };
};

export const deleteMeal = async (db: SQLiteDatabase, meal: Meal) => {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM meal_items WHERE meal_id = ?', meal.id);
    await db.runAsync('DELETE FROM meals WHERE id = ?', meal.id);
  });
  // The rows are gone either way; a missing photo file shouldn't make the delete fail
  try {
    const photo = new File(meal.photoUri);
    if (photo.exists) {
      photo.delete();
    }
  } catch (error) {
    console.warn('Failed to delete meal photo', error);
  }
};
