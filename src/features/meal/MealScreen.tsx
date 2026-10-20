import React from 'react';
import { Alert, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { SurfaceSheet } from '../../components/SurfaceSheet';
import { CloseGlyph } from '../../components/CloseGlyph';
import { SCREEN_HEIGHT } from '../../components/screen';
import { getFood, portionLabel } from '../foods/foodDb';
import type { Meal, MealSource, MealType } from '../meals/mealStore';
import { Theme } from '../../theme';

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
};

const MEAL_SOURCE_LABELS: Record<MealSource, string> = {
  home: 'Home-cooked',
  takeout: 'Takeout',
  dine_out: 'Dine-out',
};

const formatWhen = (date: Date) => {
  const day = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
  const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(date);
  return `${day} · ${time}`;
};

const formatCost = (cost: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: Number.isInteger(cost) ? 0 : 2,
  }).format(cost);

interface MealScreenProps {
  meal: Meal;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const MealScreen: React.FC<MealScreenProps> = ({ meal, onClose, onEdit, onDelete }) => {
  const [isSheetExpanded, setIsSheetExpanded] = React.useState(false);
  const food = meal.dishId ? getFood(meal.dishId) : undefined;
  const nutrition = meal.nutrition;

  const confirmDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert('Delete this meal?', 'The photo and its details will be removed from Mesa.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  const rows: [label: string, value: string][] = [];
  if (food && meal.quantity) {
    rows.push(['Portion', `${portionLabel(food, meal.quantity)}${meal.grams ? ` (~${Math.round(meal.grams)} g)` : ''}`]);
  }
  rows.push(['Meal', MEAL_TYPE_LABELS[meal.mealType]]);
  if (meal.mealSource) rows.push(['From', MEAL_SOURCE_LABELS[meal.mealSource]]);
  if (meal.place) rows.push(['Place', meal.place]);
  if (meal.cost !== null) rows.push(['Cost', formatCost(meal.cost)]);

  const editButton = (
    <Pressable style={styles.editButton} onPress={onEdit} hitSlop={8} accessibilityRole="button">
      <Text style={styles.editLabel}>Edit</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        animated
        barStyle={isSheetExpanded ? 'dark-content' : 'light-content'}
        backgroundColor={isSheetExpanded ? Theme.colors.sheetBackground : Theme.colors.canvasBackground}
      />
      <Image source={{ uri: meal.photoUri }} style={styles.photo} contentFit="cover" />

      <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12} accessibilityLabel="Close meal">
        <CloseGlyph />
      </Pressable>

      <SurfaceSheet
        title={meal.dishName ?? 'Untitled meal'}
        subtitle={formatWhen(meal.capturedAt)}
        titleAccessory={editButton}
        initialSnap="revealed"
        onExpandedChange={setIsSheetExpanded}
        dragFromHeaderOnly
        expandedOffset={0}
        revealedOffset={SCREEN_HEIGHT * 0.48}
        peekOffset={SCREEN_HEIGHT - 150}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {nutrition ? (
            <View style={styles.nutritionCard}>
              <Text style={styles.kcal}>
                ≈ {Math.round(nutrition.kcal)}
                <Text style={styles.kcalUnit}> kcal</Text>
              </Text>
              <View style={styles.macroRow}>
                <Macro label="Protein" grams={nutrition.protein_g} />
                <Macro label="Carbs" grams={nutrition.carbs_g} />
                <Macro label="Fat" grams={nutrition.fat_g} />
              </View>
              <Text style={styles.nutritionCaption}>
                {Math.round(nutrition.fiber_g)} g fiber · {Math.round(nutrition.sugars_g)} g sugars ·{' '}
                {Math.round(nutrition.sodium_mg)} mg sodium
              </Text>
              <Text style={styles.nutritionCaption}>Estimate · USDA FoodData Central</Text>
            </View>
          ) : null}

          <View style={styles.rows}>
            {rows.map(([label, value]) => (
              <View key={label} style={styles.row}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowValue}>{value}</Text>
              </View>
            ))}
          </View>

          {meal.notes ? (
            <View style={styles.notes}>
              <Text style={styles.sectionLabel}>NOTES</Text>
              <Text style={styles.notesText}>{meal.notes}</Text>
            </View>
          ) : null}

          {meal.predictedLabel && meal.predictedConfidence !== null ? (
            <Text style={styles.recognition}>
              Recognised on this phone as {meal.predictedLabel} ({Math.round(meal.predictedConfidence * 100)}%)
            </Text>
          ) : null}

          <Pressable style={styles.deleteButton} onPress={confirmDelete} accessibilityRole="button">
            <Text style={styles.deleteLabel}>Delete meal</Text>
          </Pressable>
        </ScrollView>
      </SurfaceSheet>
    </View>
  );
};

const Macro: React.FC<{ label: string; grams: number }> = ({ label, grams }) => (
  <View style={styles.macro}>
    <Text style={styles.macroValue}>{Math.round(grams)} g</Text>
    <Text style={styles.macroLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.canvasBackground,
  },
  photo: {
    height: SCREEN_HEIGHT * 0.48 + Theme.layout.deviceCornerRadius,
    width: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 64,
    left: Theme.layout.screenPadding,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 19, 18, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    borderColor: Theme.colors.sheetText,
    borderRadius: 22,
    borderWidth: 1.5,
    marginLeft: 12,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  editLabel: {
    color: Theme.colors.sheetText,
    fontSize: Theme.typography.sizes.body,
    fontWeight: Theme.typography.weights.bold,
  },
  content: {
    paddingBottom: SCREEN_HEIGHT * 0.5,
    paddingTop: 8,
  },
  nutritionCard: {
    borderColor: Theme.colors.sheetBorder,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
  },
  kcal: {
    color: Theme.colors.sheetText,
    fontSize: 40,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: -1,
  },
  kcalUnit: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 18,
    fontWeight: Theme.typography.weights.regular,
    letterSpacing: 0,
  },
  macroRow: {
    flexDirection: 'row',
    marginBottom: 12,
    marginTop: 14,
  },
  macro: {
    flex: 1,
  },
  macroValue: {
    color: Theme.colors.sheetText,
    fontSize: 20,
    fontWeight: Theme.typography.weights.bold,
  },
  macroLabel: {
    color: Theme.colors.sheetTextMuted,
    fontSize: Theme.typography.sizes.caption,
    marginTop: 2,
  },
  nutritionCaption: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 12,
    marginTop: 4,
  },
  rows: {
    marginTop: 18,
  },
  row: {
    borderBottomColor: Theme.colors.sheetBorder,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLabel: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 15,
  },
  rowValue: {
    color: Theme.colors.sheetText,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: Theme.typography.weights.bold,
    marginLeft: 16,
    textAlign: 'right',
  },
  notes: {
    marginTop: 22,
  },
  sectionLabel: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 12,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  notesText: {
    color: Theme.colors.sheetText,
    fontSize: Theme.typography.sizes.body,
    lineHeight: 23,
  },
  recognition: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 12,
    marginTop: 22,
  },
  deleteButton: {
    alignItems: 'center',
    borderColor: Theme.colors.sheetBorder,
    borderRadius: 16,
    borderWidth: 1.5,
    marginTop: 28,
    paddingVertical: 14,
  },
  deleteLabel: {
    color: Theme.colors.accent,
    fontSize: Theme.typography.sizes.body,
    fontWeight: Theme.typography.weights.bold,
  },
});
