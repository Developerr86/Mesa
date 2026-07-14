import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SurfaceSheetProps {
  children?: React.ReactNode;
  headerComponent?: React.ReactNode;
  // Snap points defined as offset from top of the screen (0 is fullscreen)
  expandedOffset?: number;
  revealedOffset?: number;
  peekOffset?: number;
  onStateChange?: (state: 'peek' | 'revealed' | 'expanded') => void;
  snapToState?: 'peek' | 'revealed' | 'expanded';
}

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 120,
  mass: 0.8,
  overshootClamping: false,
};

export const SurfaceSheet: React.FC<SurfaceSheetProps> = ({
  children,
  headerComponent,
  expandedOffset = 0,
  revealedOffset = SCREEN_HEIGHT * 0.45,
  peekOffset = SCREEN_HEIGHT - 100,
  onStateChange,
  snapToState,
}) => {
  const insets = useSafeAreaInsets();

  // Start resting at the Peek state
  const translateY = useSharedValue(peekOffset);
  const context = useSharedValue(0);

  // Programmatic snapping when parent changes snapToState
  React.useEffect(() => {
    if (snapToState === undefined) return;

    let targetOffset = peekOffset;
    if (snapToState === 'revealed') {
      targetOffset = revealedOffset;
    } else if (snapToState === 'expanded') {
      targetOffset = expandedOffset;
    }

    translateY.value = withSpring(targetOffset, SPRING_CONFIG);
  }, [snapToState, peekOffset, revealedOffset, expandedOffset]);

  // Track active state for haptic ticks
  const currentSnapState = useSharedValue<'peek' | 'revealed' | 'expanded'>('peek');

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

      // Determine state immediately on gesture end and trigger callback
      let targetState: 'peek' | 'revealed' | 'expanded' = 'peek';
      if (closestSnapPoint === expandedOffset) {
        targetState = 'expanded';
      } else if (closestSnapPoint === revealedOffset) {
        targetState = 'revealed';
      } else {
        targetState = 'peek';
      }

      if (onStateChange) {
        runOnJS(onStateChange)(targetState);
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

  // Smoothly fade out the drag handle as it nears the top (expanded)
  const handleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [expandedOffset, expandedOffset + 60],
      [0, 0.8],
      'clamp'
    );

    return {
      opacity,
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.sheet, animatedStyle]}>
        {/* Drag handle / Header bar */}
        <View style={styles.dragHandleContainer}>
          {headerComponent ? (
            headerComponent
          ) : (
            <Animated.View style={[styles.dragHandle, handleAnimatedStyle]} />
          )}
        </View>

        {/* Content of the sheet with bottom safe area padding */}
        <View style={[styles.content, { paddingBottom: insets.bottom }]}>
          {children}
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: Theme.layout.screenPadding,
  },
});
