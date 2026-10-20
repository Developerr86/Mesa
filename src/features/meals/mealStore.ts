import { Directory, File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Nutrition } from '../foods/foodDb';

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type MealSource = 'home' | 'takeout' | 'dine_out';

// Everything the details sheet collects. Nutrition is a snapshot of the food
// database at save time, so later corrections to the reference data never
// rewrite a meal that was already logged.
export interface MealDetails {
  dishId: string | null; // null when the user typed a dish we don't know
  dishName: string | null;
  quantity: number | null; // multiples of the dish's standard portion
  grams: number | null;
  nutrition: Nutrition | null;
  mealType: MealType;
  mealSource: MealSource | null;
  cost: number | null;
  place: string | null;
  notes: string | null;
  // What the on-device classifier guessed, kept to measure and retrain it
  predictedLabel: string | null;
  predictedDishId: string | null;
  predictedConfidence: number | null;
}

export interface Meal extends MealDetails {
  id: number;
  photoUri: string;
  capturedAt: Date;
}

interface MealRow {
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
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugars_g: number | null;
  sodium_mg: number | null;
  predicted_label: string | null;
  predicted_dish_id: string | null;
  predicted_confidence: number | null;
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

const toMeal = (row: MealRow): Meal => ({
  id: row.id,
  photoUri: new File(photosDirectory(), row.photo_file).uri,
  capturedAt: new Date(row.captured_at),
  dishId: row.dish_id,
  dishName: row.dish_name,
  quantity: row.quantity,
  grams: row.grams,
  nutrition:
    row.kcal === null
      ? null
      : {
          kcal: row.kcal,
          protein_g: row.protein_g ?? 0,
          carbs_g: row.carbs_g ?? 0,
          fat_g: row.fat_g ?? 0,
          fiber_g: row.fiber_g ?? 0,
          sugars_g: row.sugars_g ?? 0,
          sodium_mg: row.sodium_mg ?? 0,
        },
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
  return rows.map(toMeal);
};

type DetailColumns = Omit<MealRow, 'id' | 'photo_file' | 'captured_at'>;

const detailColumns = (details: MealDetails): DetailColumns => ({
  cost: details.cost,
  place: details.place,
  notes: details.notes,
  dish_id: details.dishId,
  dish_name: details.dishName,
  quantity: details.quantity,
  grams: details.grams,
  meal_type: details.mealType,
  meal_source: details.mealSource,
  kcal: details.nutrition?.kcal ?? null,
  protein_g: details.nutrition?.protein_g ?? null,
  carbs_g: details.nutrition?.carbs_g ?? null,
  fat_g: details.nutrition?.fat_g ?? null,
  fiber_g: details.nutrition?.fiber_g ?? null,
  sugars_g: details.nutrition?.sugars_g ?? null,
  sodium_mg: details.nutrition?.sodium_mg ?? null,
  predicted_label: details.predictedLabel,
  predicted_dish_id: details.predictedDishId,
  predicted_confidence: details.predictedConfidence,
});

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
    const result = await db.runAsync(
      `INSERT INTO meals (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      Object.values(row)
    );

    return toMeal({ id: result.lastInsertRowId, ...row });
  } catch (error) {
    // Don't leave an orphaned photo behind if the row couldn't be written
    destination.delete();
    throw error;
  }
};

// Rewrites everything the details sheet edits; the photo and capture time never change.
export const updateMeal = async (db: SQLiteDatabase, meal: Meal, details: MealDetails): Promise<Meal> => {
  const columns = detailColumns(details);
  await db.runAsync(
    `UPDATE meals SET ${Object.keys(columns)
      .map((column) => `${column} = ?`)
      .join(', ')} WHERE id = ?`,
    [...Object.values(columns), meal.id]
  );
  return { ...meal, ...details };
};

export const deleteMeal = async (db: SQLiteDatabase, meal: Meal) => {
  await db.runAsync('DELETE FROM meals WHERE id = ?', meal.id);
  // The row is gone either way; a missing photo file shouldn't make the delete fail
  try {
    const photo = new File(meal.photoUri);
    if (photo.exists) {
      photo.delete();
    }
  } catch (error) {
    console.warn('Failed to delete meal photo', error);
  }
};
