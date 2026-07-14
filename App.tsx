import React from 'react';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationBar } from 'expo-navigation-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { HomeScreen } from './src/features/home/HomeScreen';
import { Theme } from './src/theme';

import { useFonts } from 'expo-font';

/**
 * Initializes the SQLite database schema on launch.
 */
async function initDatabase(db: SQLiteDatabase) {
  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS meals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        photoUri TEXT NOT NULL,
        cost REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        place TEXT,
        sourceType TEXT,
        duration INTEGER
      );
    `);
  } catch (error) {
    console.error('Failed to initialize SQLite database:', error);
  }
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'Nexa-Bold': require('./assets/Nexa-Bold.otf'),
    'Nexa-Light': require('./assets/Nexa-Light.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Theme.colors.accent} />
      </View>
    );
  }

  return (
    <SQLiteProvider databaseName="mesa.db" onInit={initDatabase} useSuspense>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          {/*
            Declare the default dark style for the Android navigation bar buttons.
            Since Mesa uses a light bottom sheet, dark buttons are required for contrast.
          */}
          <NavigationBar style="dark" />
          <HomeScreen />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Theme.colors.canvasBackground,
  },
});



