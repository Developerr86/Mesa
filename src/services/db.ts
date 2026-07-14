import { type SQLiteDatabase } from 'expo-sqlite';

export interface Meal {
  id: number;
  photoUri: string;
  cost: number;
  timestamp: number;
  place: string | null;
  sourceType: 'home_cooked' | 'takeout' | 'dine_out' | null;
  duration: number | null; // in minutes
}

/**
 * Inserts a new meal record into the SQLite database.
 * Returns the last inserted row ID.
 */
export async function insertMeal(
  db: SQLiteDatabase,
  meal: Omit<Meal, 'id'>
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO meals (photoUri, cost, timestamp, place, sourceType, duration) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      meal.photoUri,
      meal.cost,
      meal.timestamp,
      meal.place ?? null,
      meal.sourceType ?? null,
      meal.duration ?? null,
    ]
  );
  return result.lastInsertRowId;
}

/**
 * Retrieves all meals from the database ordered by timestamp descending.
 */
export async function getMeals(db: SQLiteDatabase): Promise<Meal[]> {
  return await db.getAllAsync<Meal>('SELECT * FROM meals ORDER BY timestamp DESC');
}

/**
 * Deletes a meal record from the database by its ID.
 */
export async function deleteMeal(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM meals WHERE id = ?', [id]);
}
