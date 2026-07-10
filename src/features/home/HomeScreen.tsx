import React from 'react';
import {
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SurfaceSheet } from '../../components/SurfaceSheet';
import { Theme } from '../../theme';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

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

export const HomeScreen: React.FC = () => {
  const { day, dayAndMonth } = formatToday();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.canvasBackground} />

      <View style={styles.canvasContainer}>
        <View style={styles.greetingContent}>
          <View style={styles.headerContainer}>
            <Text style={styles.heroNumeral}>{day}</Text>
            <Text style={styles.subNumeralText}>{dayAndMonth}</Text>
          </View>

          <View style={styles.greetingMessageContainer}>
            <Text style={styles.eyebrow}>YOUR FOOD JOURNAL</Text>
            <Text style={styles.emptyHeadline}>
              Nothing on the <Text style={styles.accentText}>table</Text> yet.
            </Text>
            <Text style={styles.emptySupportingText}>
              Your next meal can become the first memory in Mesa.
            </Text>
          </View>
        </View>
      </View>

      <SurfaceSheet
        peekOffset={SCREEN_HEIGHT - 120}
        revealedOffset={SCREEN_HEIGHT - 480}
        expandedOffset={0}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Meal History</Text>
          <Text style={styles.sheetSubtitle}>Your memories, one plate at a time</Text>
        </View>

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
      </SurfaceSheet>
    </View>
  );
};

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
  sheetHeader: {
    marginBottom: 8,
    marginTop: 8,
  },
  sheetTitle: {
    color: Theme.colors.sheetText,
    fontSize: Theme.typography.sizes.title,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: -0.5,
  },
  sheetSubtitle: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 14,
    fontWeight: Theme.typography.weights.regular,
    marginTop: 2,
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
});
