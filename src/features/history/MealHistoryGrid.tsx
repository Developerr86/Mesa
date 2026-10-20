import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { Meal } from '../meals/mealStore';
import { Theme } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLUMN_GAP = 12;
const TILE_SIZE = (SCREEN_WIDTH - Theme.layout.screenPadding * 2 - COLUMN_GAP) / 2;

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const formatCapturedAt = (capturedAt: Date) => {
  const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(capturedAt);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

  if (isSameDay(capturedAt, today)) {
    return `Today, ${time}`;
  }
  if (isSameDay(capturedAt, yesterday)) {
    return `Yesterday, ${time}`;
  }

  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(capturedAt);
};

interface MealHistoryGridProps {
  meals: Meal[];
  onSelect: (meal: Meal) => void;
}

export const MealHistoryGrid: React.FC<MealHistoryGridProps> = ({ meals, onSelect }) => (
  <View style={styles.grid}>
    {meals.map((meal) => (
      <Pressable
        key={meal.id}
        style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
        onPress={() => onSelect(meal)}
        accessibilityRole="button"
      >
        <Image
          source={{ uri: meal.photoUri }}
          style={styles.photo}
          contentFit="cover"
          transition={200}
          accessibilityLabel={`${meal.dishName ?? 'Meal'}, ${formatCapturedAt(meal.capturedAt)}`}
        />
        {meal.dishName ? (
          <Text style={styles.dishName} numberOfLines={1}>
            {meal.dishName}
          </Text>
        ) : null}
        <Text style={[styles.caption, meal.dishName ? styles.captionUnderName : null]}>
          {formatCapturedAt(meal.capturedAt)}
        </Text>
      </Pressable>
    ))}
  </View>
);

const styles = StyleSheet.create({
  grid: {
    columnGap: COLUMN_GAP,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 12,
    rowGap: 20,
  },
  tile: {
    width: TILE_SIZE,
  },
  tilePressed: {
    opacity: 0.7,
  },
  photo: {
    backgroundColor: Theme.colors.sheetBorder,
    borderRadius: 20,
    height: TILE_SIZE,
    width: TILE_SIZE,
  },
  dishName: {
    color: Theme.colors.sheetText,
    fontSize: 15,
    fontWeight: Theme.typography.weights.bold,
    marginTop: 8,
  },
  caption: {
    color: Theme.colors.sheetTextMuted,
    fontSize: Theme.typography.sizes.caption,
    fontWeight: Theme.typography.weights.regular,
    marginTop: 8,
  },
  captionUnderName: {
    marginTop: 2,
  },
});
