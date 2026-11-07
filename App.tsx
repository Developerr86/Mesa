import React from 'react';
import { BackHandler } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SQLiteProvider } from 'expo-sqlite';
import { HomeScreen } from './src/features/home/HomeScreen';
import { CaptureScreen } from './src/features/capture/CaptureScreen';
import { MealDetailsScreen } from './src/features/details/MealDetailsScreen';
import { MealScreen } from './src/features/meal/MealScreen';
import { SettingsScreen } from './src/features/settings/SettingsScreen';
import { useSettings } from './src/features/settings/settings';
import { DATABASE_NAME, migrateDbIfNeeded } from './src/features/meals/mealStore';
import { useMeals } from './src/features/meals/useMeals';
import type { ProductScan } from './src/features/products/productStore';

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
  | { name: 'details'; photoUri: string; scan: ProductScan | null }
  | { name: 'meal'; mealId: number }
  | { name: 'edit'; mealId: number }
  | { name: 'settings' };

function Mesa() {
  const [screen, setScreen] = React.useState<Screen>({ name: 'home' });
  const { meals, addMeal, editMeal, removeMeal } = useMeals();
  const { settings, updateSetting } = useSettings();
  const goHome = () => setScreen({ name: 'home' });
  const selectedMeal =
    screen.name === 'meal' || screen.name === 'edit' ? meals.find((meal) => meal.id === screen.mealId) : undefined;

  // Android's back button steps back through Mesa's screens instead of leaving the app
  React.useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen.name === 'home') return false;
      setScreen(screen.name === 'edit' ? { name: 'meal', mealId: screen.mealId } : { name: 'home' });
      return true;
    });
    return () => subscription.remove();
  }, [screen]);

  switch (screen.name) {
    case 'capture':
      return (
        <CaptureScreen
          onClose={goHome}
          onCapture={(photoUri, scan) => setScreen({ name: 'details', photoUri, scan })}
        />
      );
    case 'details':
      return (
        <MealDetailsScreen
          photoUri={screen.photoUri}
          scan={screen.scan}
          askCostForHomeMeals={settings.askCostForHomeMeals}
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
          askCostForHomeMeals={settings.askCostForHomeMeals}
          onCancel={() => setScreen({ name: 'meal', mealId: selectedMeal.id })}
          onSave={(details) => {
            editMeal(selectedMeal, details);
            setScreen({ name: 'meal', mealId: selectedMeal.id });
          }}
        />
      );
    case 'settings':
      return <SettingsScreen settings={settings} onChange={updateSetting} onClose={goHome} />;
  }

  return (
    <HomeScreen
      meals={meals}
      onCapturePress={() => setScreen({ name: 'capture' })}
      onMealPress={(meal) => setScreen({ name: 'meal', mealId: meal.id })}
      onSettingsPress={() => setScreen({ name: 'settings' })}
    />
  );
}
