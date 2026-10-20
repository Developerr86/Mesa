import React from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SurfaceSheet } from '../../components/SurfaceSheet';
import { SCREEN_HEIGHT } from '../../components/screen';
import { MealHistoryGrid } from '../history/MealHistoryGrid';
import type { Meal } from '../meals/mealStore';
import { Theme } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatToday = () => {
  const today = new Date();

  return {
    day: new Intl.DateTimeFormat('en-IN', { day: '2-digit' }).format(today),
    dayAndMonth: `${new Intl.DateTimeFormat('en-IN', {
      weekday: 'long',
    }).format(today)}, ${new Intl.DateTimeFormat('en-IN', {
      month: 'long',
    }).format(today)}`,
  };
};

const countMealsToday = (meals: Meal[]) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return meals.filter((meal) => meal.capturedAt >= startOfToday).length;
};

interface HomeScreenProps {
  meals: Meal[];
  onCapturePress: () => void;
  onMealPress: (meal: Meal) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ meals, onCapturePress, onMealPress }) => {
  const { day, dayAndMonth } = formatToday();
  const mealsToday = countMealsToday(meals);
  const [isSheetExpanded, setIsSheetExpanded] = React.useState(false);

  const handleCapturePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onCapturePress();
  };

  return (
    <View style={styles.container}>
      <StatusBar
        animated
        barStyle={isSheetExpanded ? 'dark-content' : 'light-content'}
        backgroundColor={isSheetExpanded ? Theme.colors.sheetBackground : Theme.colors.canvasBackground}
      />

      <View style={styles.canvasContainer}>
        <View style={styles.greetingContent}>
          <View style={styles.headerContainer}>
            <Text style={styles.heroNumeral}>{day}</Text>
            <Text style={styles.subNumeralText}>{dayAndMonth}</Text>
          </View>

          <View style={styles.greetingMessageContainer}>
            <Text style={styles.eyebrow}>YOUR FOOD JOURNAL</Text>
            {mealsToday > 0 ? (
              <Text style={styles.emptyHeadline}>
                {mealsToday} {mealsToday === 1 ? 'meal' : 'meals'} on the{' '}
                <Text style={styles.accentText}>table</Text> today.
              </Text>
            ) : (
              <Text style={styles.emptyHeadline}>
                Nothing on the <Text style={styles.accentText}>table</Text>{' '}
                {meals.length > 0 ? 'today.' : 'yet.'}
              </Text>
            )}
            <Text style={styles.emptySupportingText}>
              {meals.length > 0
                ? `${meals.length} ${meals.length === 1 ? 'memory' : 'memories'} in your journal so far.`
                : 'Your next meal can become the first memory in Mesa.'}
            </Text>
          </View>
        </View>

        <Pressable style={styles.captureButton} onPress={handleCapturePress} hitSlop={8}>
          <CameraGlyph />
        </Pressable>
      </View>

      <SurfaceSheet
        peekOffset={SCREEN_HEIGHT - 120}
        revealedOffset={SCREEN_HEIGHT - 480}
        expandedOffset={0}
        title="Meal History"
        subtitle="Your memories, one plate at a time"
        onExpandedChange={setIsSheetExpanded}
      >
        {meals.length > 0 ? (
          <MealHistoryGrid meals={meals} onSelect={onMealPress} />
        ) : (
          <View style={styles.emptyHistory}>
            <View style={styles.plateIllustration}>
              <View style={styles.plateInner}>
                <View style={styles.plateHighlight} />
              </View>
            </View>
            <Text style={styles.emptyHistoryTitle}>Your history starts here</Text>
            <Text style={styles.emptyHistoryBody}>
              Meals you capture will gather here as a personal gallery of places,
              moments, and things worth tasting again.
            </Text>
          </View>
        )}
      </SurfaceSheet>
    </View>
  );
};

const CameraGlyph: React.FC = () => (
  <View style={styles.cameraBody}>
    <View style={styles.cameraBump} />
    <View style={styles.cameraLensOuter}>
      <View style={styles.cameraLensInner} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.canvasBackground,
  },
  canvasContainer: {
    flex: 1,
    height: SCREEN_HEIGHT,
  },
  greetingContent: {
    flex: 1,
    paddingHorizontal: Theme.layout.screenPadding,
    paddingTop:
      (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 44) +
      SCREEN_HEIGHT * 0.045,
  },
  headerContainer: {
    marginBottom: 58,
  },
  heroNumeral: {
    color: Theme.colors.canvasText,
    fontSize: Theme.typography.sizes.hero,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: -2,
    lineHeight: Theme.typography.sizes.hero + 10,
  },
  subNumeralText: {
    color: Theme.colors.canvasTextMuted,
    fontSize: 16,
    fontWeight: Theme.typography.weights.regular,
    marginTop: -4,
  },
  greetingMessageContainer: {
    maxWidth: SCREEN_WIDTH * 0.84,
  },
  eyebrow: {
    color: Theme.colors.canvasTextMuted,
    fontSize: 12,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: 1.8,
    marginBottom: 14,
  },
  emptyHeadline: {
    color: Theme.colors.canvasText,
    fontSize: 32,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: -0.8,
    lineHeight: 39,
  },
  accentText: {
    color: Theme.colors.accent,
  },
  emptySupportingText: {
    color: Theme.colors.canvasTextMuted,
    fontSize: Theme.typography.sizes.body,
    fontWeight: Theme.typography.weights.regular,
    lineHeight: 24,
    marginTop: 14,
    maxWidth: 310,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 48,
  },
  plateIllustration: {
    alignItems: 'center',
    backgroundColor: Theme.colors.accentMuted,
    borderRadius: 52,
    height: 104,
    justifyContent: 'center',
    marginBottom: 28,
    width: 104,
  },
  plateInner: {
    alignItems: 'flex-end',
    borderColor: Theme.colors.accent,
    borderRadius: 34,
    borderWidth: 2,
    height: 68,
    justifyContent: 'flex-start',
    padding: 10,
    width: 68,
  },
  plateHighlight: {
    backgroundColor: Theme.colors.accent,
    borderRadius: 4,
    height: 8,
    opacity: 0.65,
    width: 8,
  },
  emptyHistoryTitle: {
    color: Theme.colors.sheetText,
    fontSize: 20,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: -0.3,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyHistoryBody: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 15,
    fontWeight: Theme.typography.weights.regular,
    lineHeight: 22,
    maxWidth: 320,
    textAlign: 'center',
  },
  captureButton: {
    position: 'absolute',
    bottom: 160,
    right: Theme.layout.screenPadding,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  cameraBody: {
    width: 30,
    height: 22,
    borderRadius: 6,
    backgroundColor: Theme.colors.canvasText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBump: {
    position: 'absolute',
    top: -5,
    width: 12,
    height: 6,
    borderRadius: 2,
    backgroundColor: Theme.colors.canvasText,
  },
  cameraLensOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraLensInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.canvasText,
  },
});
