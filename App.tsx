import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SQLiteProvider } from 'expo-sqlite';
import { HomeScreen } from './src/features/home/HomeScreen';
import { CaptureScreen } from './src/features/capture/CaptureScreen';
import { MealDetailsScreen } from './src/features/details/MealDetailsScreen';
import { MealScreen } from './src/features/meal/MealScreen';
import { DATABASE_NAME, migrateDbIfNeeded } from './src/features/meals/mealStore';
import { useMeals } from './src/features/meals/useMeals';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
        <Mesa />
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}

type Screen =
  | { name: 'home' }
  | { name: 'capture' }
  | { name: 'details'; photoUri: string }
  | { name: 'meal'; mealId: number }
  | { name: 'edit'; mealId: number };

function Mesa() {
  const [screen, setScreen] = React.useState<Screen>({ name: 'home' });
  const { meals, addMeal, editMeal, removeMeal } = useMeals();
  const goHome = () => setScreen({ name: 'home' });
  const selectedMeal =
    screen.name === 'meal' || screen.name === 'edit' ? meals.find((meal) => meal.id === screen.mealId) : undefined;

  switch (screen.name) {
    case 'capture':
      return (
        <CaptureScreen
          onClose={goHome}
          onCapture={(photoUri) => setScreen({ name: 'details', photoUri })}
        />
      );
    case 'details':
      return (
        <MealDetailsScreen
          photoUri={screen.photoUri}
          onCancel={goHome}
          onRetake={() => setScreen({ name: 'capture' })}
          onSave={(details, capturedAt) => {
            addMeal(screen.photoUri, details, capturedAt);
            goHome();
          }}
        />
      );
    case 'meal':
      if (!selectedMeal) break;
      return (
        <MealScreen
          meal={selectedMeal}
          onClose={goHome}
          onEdit={() => setScreen({ name: 'edit', mealId: selectedMeal.id })}
          onDelete={() => {
            removeMeal(selectedMeal);
            goHome();
          }}
        />
      );
    case 'edit':
      if (!selectedMeal) break;
      return (
        <MealDetailsScreen
          photoUri={selectedMeal.photoUri}
          meal={selectedMeal}
          onCancel={() => setScreen({ name: 'meal', mealId: selectedMeal.id })}
          onSave={(details) => {
            editMeal(selectedMeal, details);
            setScreen({ name: 'meal', mealId: selectedMeal.id });
          }}
        />
      );
  }

  return (
    <HomeScreen
      meals={meals}
      onCapturePress={() => setScreen({ name: 'capture' })}
      onMealPress={(meal) => setScreen({ name: 'meal', mealId: meal.id })}
    />
  );
}
