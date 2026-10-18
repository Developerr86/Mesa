import React from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { listMeals, saveMeal, type Meal, type MealDetails } from './mealStore';

export const useMeals = () => {
  const db = useSQLiteContext();
  const [meals, setMeals] = React.useState<Meal[]>([]);

  React.useEffect(() => {
    listMeals(db)
      .then(setMeals)
      .catch((error) => console.warn('Failed to load meals', error));
  }, [db]);

  const addMeal = React.useCallback(
    async (photoUri: string, details: MealDetails) => {
      try {
        const meal = await saveMeal(db, photoUri, details);
        setMeals((current) => [meal, ...current]);
      } catch (error) {
        console.warn('Failed to save meal', error);
      }
    },
    [db]
  );

  return { meals, addMeal };
};
