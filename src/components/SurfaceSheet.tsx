import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useAnimatedReaction,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
  useDerivedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Theme } from '../theme';
import { SCREEN_HEIGHT } from './screen';


export type SnapState = 'peek' | 'revealed' | 'expanded';

export interface SurfaceSheetHandle {
  snapTo: (state: SnapState) => void;
}

interface SurfaceSheetProps {
  ref?: React.Ref<SurfaceSheetHandle>;
  children?: React.ReactNode;
  headerComponent?: React.ReactNode;
  title?: string;
  subtitle?: string;
  // Rendered at the trailing edge of the title row (e.g. a Save button)
  titleAccessory?: React.ReactNode;
  // Called when the sheet crosses into/out of the fullscreen Expanded state
  onExpandedChange?: (isExpanded: boolean) => void;
  // Snap points defined as offset from top of the screen (0 is fullscreen)
  expandedOffset?: number;
  revealedOffset?: number;
  peekOffset?: number;
  initialSnap?: SnapState;
  // Only the handle and title drag the sheet, leaving the content free to scroll
  dragFromHeaderOnly?: boolean;
}

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 120,
  mass: 0.8,
  overshootClamping: false,
};

export const SurfaceSheet: React.FC<SurfaceSheetProps> = ({
  ref,
  children,
  headerComponent,
  title,
  subtitle,
  titleAccessory,
  onExpandedChange,
  expandedOffset = 0,
  revealedOffset = SCREEN_HEIGHT * 0.45,
  peekOffset = SCREEN_HEIGHT - 100,
  initialSnap = 'peek',
  dragFromHeaderOnly = false,
}) => {
  const offsets: Record<SnapState, number> = {
    peek: peekOffset,
    revealed: revealedOffset,
    expanded: expandedOffset,
  };

  const translateY = useSharedValue(offsets[initialSnap]);
  const context = useSharedValue(0);

  // Track active state for haptic ticks
  const currentSnapState = useSharedValue<SnapState>(initialSnap);

  React.useImperativeHandle(ref, () => ({
    snapTo: (state) => {
      currentSnapState.value = state;
      translateY.value = withSpring(offsets[state], SPRING_CONFIG);
    },
  }));

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const runHaptic = () => {
    'worklet';
    runOnJS(triggerHaptic)();
  };

  const midExpandedRevealed = (expandedOffset + revealedOffset) / 2;
  const midRevealedPeek = (revealedOffset + peekOffset) / 2;
  const snapPoints = [expandedOffset, revealedOffset, peekOffset];

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = translateY.value;
    })
    .onUpdate((event) => {
      let nextValue = context.value + event.translationY;

      // Add resistance when pulling past expanded (top of screen)
      if (nextValue < expandedOffset) {
        nextValue = expandedOffset + (nextValue - expandedOffset) * 0.25;
      }
      // Add resistance when pulling below peek (bottom of screen)
      if (nextValue > peekOffset) {
        nextValue = peekOffset + (nextValue - peekOffset) * 0.25;
      }

      translateY.value = nextValue;

      // Haptic feedback when crossing state boundaries during active drag
      let closestState: 'peek' | 'revealed' | 'expanded' = 'peek';
      if (nextValue < midExpandedRevealed) {
        closestState = 'expanded';
      } else if (nextValue < midRevealedPeek) {
        closestState = 'revealed';
      } else {
        closestState = 'peek';
      }

      if (currentSnapState.value !== closestState) {
        currentSnapState.value = closestState;
        runHaptic();
      }
    })
    .onEnd((event) => {
      const currentPos = translateY.value;
      const velocity = event.velocityY;

      // Predict landing position based on release velocity (120ms lookahead)
      const targetPos = currentPos + velocity * 0.12;

      // Find closest snap point
      let closestSnapPoint = snapPoints[0];
      let minDistance = Math.abs(targetPos - closestSnapPoint);

      for (let i = 1; i < snapPoints.length; i++) {
        const dist = Math.abs(targetPos - snapPoints[i]);
        if (dist < minDistance) {
          minDistance = dist;
          closestSnapPoint = snapPoints[i];
        }
      }

      // Animate with premium spring physics
      translateY.value = withSpring(closestSnapPoint, SPRING_CONFIG, (finished) => {
        if (finished) {
          // Double confirmation haptic click on settling
          runHaptic();
        }
      });
    });

  // Animate corner radius dynamically as the sheet nears expanded state
  const animatedStyle = useAnimatedStyle(() => {
    const borderRadius = interpolate(
      translateY.value,
      [expandedOffset, revealedOffset],
      [0, Theme.layout.deviceCornerRadius],
      'clamp'
    );

    return {
      transform: [{ translateY: translateY.value }],
      borderRadius,
    };
  });

  // Notify the host screen when the sheet crosses into/out of fullscreen,
  // so it can flip the status bar to stay legible against the sheet background.
  useAnimatedReaction(
    () => translateY.value < midExpandedRevealed,
    (isExpanded, wasExpanded) => {
      if (isExpanded !== wasExpanded && onExpandedChange) {
        runOnJS(onExpandedChange)(isExpanded);
      }
    }
  );

  // Title grows and settles lower, subtitle fades out, as the sheet nears fullscreen
  const titleAnimatedStyle = useAnimatedStyle(() => {
    const fontSize = interpolate(
      translateY.value,
      [expandedOffset, revealedOffset],
      [34, Theme.typography.sizes.title],
      'clamp'
    );
    const shiftDown = interpolate(
      translateY.value,
      [expandedOffset, revealedOffset],
      [14, 0],
      'clamp'
    );

    return {
      fontSize,
      transform: [{ translateY: shiftDown }],
    };
  });

  const subtitleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [expandedOffset, revealedOffset],
      [0, 1],
      'clamp'
    );

    return { opacity };
  });

  const header = (
    <View>
      {/* Drag handle / Header bar */}
      <View style={styles.dragHandleContainer}>
        {headerComponent ? (
          headerComponent
        ) : (
          <View style={styles.dragHandle} />
        )}
      </View>

      {/* Title / subtitle header, animated as the sheet nears fullscreen */}
      {title ? (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Animated.Text style={[styles.title, titleAnimatedStyle]}>{title}</Animated.Text>
            {subtitle ? (
              <Animated.Text style={[styles.subtitle, subtitleAnimatedStyle]}>
                {subtitle}
              </Animated.Text>
            ) : null}
          </View>
          {titleAccessory}
        </View>
      ) : null}
    </View>
  );

  const content = <View style={styles.content}>{children}</View>;

  if (dragFromHeaderOnly) {
    return (
      <Animated.View style={[styles.sheet, animatedStyle]}>
        <GestureDetector gesture={panGesture}>{header}</GestureDetector>
        {content}
      </Animated.View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.sheet, animatedStyle]}>
        {header}
        {content}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: Theme.colors.sheetBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 24,
    overflow: 'hidden',
  },
  dragHandleContainer: {
    width: '100%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.sheetBackground,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Theme.colors.accent, // signature accent drag handle
    opacity: 0.8,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
    marginTop: 8,
    paddingHorizontal: Theme.layout.screenPadding,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: Theme.colors.sheetText,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 14,
    fontWeight: Theme.typography.weights.regular,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: Theme.layout.screenPadding,
  },
});
