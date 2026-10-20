import React from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { deleteMeal, listMeals, saveMeal, updateMeal, type Meal, type MealDetails } from './mealStore';

export const useMeals = () => {
  const db = useSQLiteContext();
  const [meals, setMeals] = React.useState<Meal[]>([]);

  React.useEffect(() => {
    listMeals(db)
      .then(setMeals)
      .catch((error) => console.warn('Failed to load meals', error));
  }, [db]);

  const addMeal = React.useCallback(
    async (photoUri: string, details: MealDetails, capturedAt: Date) => {
      try {
        const meal = await saveMeal(db, photoUri, details, capturedAt);
        setMeals((current) => [meal, ...current]);
      } catch (error) {
        console.warn('Failed to save meal', error);
      }
    },
    [db]
  );

  const editMeal = React.useCallback(
    async (meal: Meal, details: MealDetails) => {
      try {
        const updated = await updateMeal(db, meal, details);
        setMeals((current) => current.map((m) => (m.id === meal.id ? updated : m)));
      } catch (error) {
        console.warn('Failed to update meal', error);
      }
    },
    [db]
  );

  const removeMeal = React.useCallback(
    async (meal: Meal) => {
      try {
        await deleteMeal(db, meal);
        setMeals((current) => current.filter((m) => m.id !== meal.id));
      } catch (error) {
        console.warn('Failed to delete meal', error);
      }
    },
    [db]
  );

  return { meals, addMeal, editMeal, removeMeal };
};
