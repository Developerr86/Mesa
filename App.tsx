import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SQLiteProvider } from 'expo-sqlite';
import { HomeScreen } from './src/features/home/HomeScreen';
import { CaptureScreen } from './src/features/capture/CaptureScreen';
import { MealDetailsScreen } from './src/features/details/MealDetailsScreen';
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

type Screen = { name: 'home' } | { name: 'capture' } | { name: 'details'; photoUri: string };

function Mesa() {
  const [screen, setScreen] = React.useState<Screen>({ name: 'home' });
  const { meals, addMeal } = useMeals();
  const goHome = () => setScreen({ name: 'home' });

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
          onSave={(details) => {
            addMeal(screen.photoUri, details);
            goHome();
          }}
        />
      );
    default:
      return <HomeScreen meals={meals} onCapturePress={() => setScreen({ name: 'capture' })} />;
  }
}
