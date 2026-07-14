import React, { useState, useEffect, useRef } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSQLiteContext } from 'expo-sqlite';
import { Image } from 'expo-image';
import { ScrollView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle } from 'react-native-svg';

import { SurfaceSheet } from '../../components/SurfaceSheet';
import { ConfirmDetailsForm } from '../../components/ConfirmDetailsForm';
import { Theme } from '../../theme';
import { getMeals, insertMeal, deleteMeal, type Meal } from '../../services/db';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const CameraIcon = ({ color = '#FFFFFF', size = 18 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5}>
    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="13" r="4" />
  </Svg>
);

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
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();

  // App States
  const [appState, setAppState] = useState<'idle' | 'capturing' | 'confirming'>('idle');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [heroMeal, setHeroMeal] = useState<Meal | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [sheetState, setSheetState] = useState<'peek' | 'revealed' | 'expanded'>('peek');
  const [statusBarStyle, setStatusBarStyle] = useState<'light' | 'dark'>('light');

  // Camera
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const loadMeals = async () => {
    try {
      const data = await getMeals(db);
      setMeals(data);

      // Find the most recent meal logged today
      const today = new Date();
      const todayMeals = data.filter((meal) => {
        const mealDate = new Date(meal.timestamp);
        return (
          mealDate.getDate() === today.getDate() &&
          mealDate.getMonth() === today.getMonth() &&
          mealDate.getFullYear() === today.getFullYear()
        );
      });

      if (todayMeals.length > 0) {
        setHeroMeal(todayMeals[0]);
      } else {
        setHeroMeal(null);
      }
    } catch (err) {
      console.error('Failed to load meals:', err);
    }
  };

  useEffect(() => {
    loadMeals();
  }, []);

  const handleStateChange = (state: 'peek' | 'revealed' | 'expanded') => {
    setSheetState(state);
    setStatusBarStyle(state === 'expanded' ? 'dark' : 'light');
  };

  const startCapture = async () => {
    if (!permission || !permission.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setAppState('capturing');
    setSheetState('peek'); // Hide bottom sheet programmatically
  };

  const cancelCapture = () => {
    setAppState('idle');
    setSheetState('peek');
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          skipProcessing: false,
        });

        if (photo?.uri) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          setPhotoUri(photo.uri);
          setAppState('confirming');
          setSheetState('revealed'); // Slide up to revealed
        }
      } catch (err) {
        console.error('Failed to take picture:', err);
      }
    }
  };

  const handleSaveMeal = async (details: {
    cost: number;
    place: string | null;
    sourceType: 'home_cooked' | 'takeout' | 'dine_out' | null;
    duration: number | null;
  }) => {
    if (!photoUri) return;

    try {
      await insertMeal(db, {
        photoUri,
        cost: details.cost,
        timestamp: Date.now(),
        place: details.place,
        sourceType: details.sourceType,
        duration: details.duration,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setPhotoUri(null);
      setAppState('idle');
      setSheetState('peek');
      await loadMeals();
    } catch (err) {
      console.error('Failed to save meal:', err);
    }
  };

  const handleDiscardMeal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPhotoUri(null);
    setAppState('capturing');
    setSheetState('peek'); // Slide sheet back down
  };

  const handleDeleteMeal = async (id: number) => {
    try {
      await deleteMeal(db, id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await loadMeals();
    } catch (err) {
      console.error('Failed to delete meal:', err);
    }
  };

  const formatSourceType = (type: string | null) => {
    if (type === 'home_cooked') return 'Home Cooked';
    if (type === 'takeout') return 'Takeout';
    if (type === 'dine_out') return 'Dine Out';
    return 'Meal';
  };

  // Rendering logic for when viewfinder is active
  if (appState === 'capturing') {
    if (!permission) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.colors.accent} />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionDescription}>
            Mesa needs access to your camera to snap photos of your meals and build your personal food history.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Allow Camera Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelPermissionButton} onPress={cancelCapture}>
            <Text style={styles.cancelPermissionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <StatusBar style="light" />

        {/* Top Bar (Cancel Button) */}
        <View style={[styles.cameraTopBar, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity style={styles.closeCameraButton} onPress={cancelCapture}>
            <Text style={styles.closeCameraText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Viewfinder Centered in 3:4 Ratio */}
        <View style={styles.viewfinderWrapper}>
          <CameraView
            style={StyleSheet.absoluteFill}
            ref={cameraRef}
            facing="back"
            mode="picture"
          />
        </View>

        {/* Shutter Button Area */}
        <View style={styles.shutterContainer}>
          <TouchableOpacity style={styles.shutterOuter} onPress={takePicture}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Rendering logic for confirming or idle
  return (
    <View style={styles.container}>
      <StatusBar style={statusBarStyle} />

      <View style={styles.canvasContainer}>
        {/* If in confirming state, show photo preview. If idle and meal exists, show hero photo background. */}
        {appState === 'confirming' && photoUri ? (
          <View style={styles.viewfinderWrapper}>
            <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          </View>
        ) : heroMeal ? (
          <Image source={{ uri: heroMeal.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : null}

        {/* Translucent overlay for photography background */}
        {(appState === 'confirming' || heroMeal) && (
          <View style={[StyleSheet.absoluteFill, styles.darkOverlay]} />
        )}

        <View
          style={[
            styles.greetingContent,
            { paddingTop: insets.top + SCREEN_HEIGHT * 0.045 },
          ]}
        >
          <View style={styles.headerContainer}>
            <Text style={styles.heroNumeral}>{day}</Text>
            <Text style={styles.subNumeralText}>{dayAndMonth}</Text>
          </View>

          {/* Display today's logged meal summary or the empty state greeting */}
          {heroMeal && appState === 'idle' ? (
            <View style={styles.greetingMessageContainer}>
              <Text style={styles.eyebrow}>TODAY'S HIGHLIGHT</Text>
              <Text style={styles.emptyHeadline}>
                Spent <Text style={styles.accentText}>₹{heroMeal.cost}</Text> on {heroMeal.place || formatSourceType(heroMeal.sourceType)}.
              </Text>
              <Text style={styles.emptySupportingText}>
                Logged at {new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(heroMeal.timestamp))} • took {heroMeal.duration || 30} mins.
              </Text>
            </View>
          ) : appState === 'idle' ? (
            <View style={styles.greetingMessageContainer}>
              <Text style={styles.eyebrow}>YOUR FOOD JOURNAL</Text>
              <Text style={styles.emptyHeadline}>
                Nothing on the <Text style={styles.accentText}>table</Text> yet.
              </Text>
              <Text style={styles.emptySupportingText}>
                Your next meal can become the first memory in Mesa.
              </Text>
              <TouchableOpacity style={styles.captureActionButton} onPress={startCapture}>
                <CameraIcon color="#FFFFFF" size={18} />
                <Text style={[styles.captureActionText, { marginLeft: 8 }]}>Add Meal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // During confirming view (photo preview mode)
            <View style={styles.greetingMessageContainer}>
              <Text style={styles.eyebrow}>LOGGING MEAL</Text>
              <Text style={styles.emptyHeadline}>
                Capture <Text style={styles.accentText}>successful</Text>!
              </Text>
              <Text style={styles.emptySupportingText}>
                Fill in the details below to save your meal.
              </Text>
            </View>
          )}
        </View>

        {/* Floating Action Button (FAB) for adding another meal when hero photo background is visible */}
        {heroMeal && appState === 'idle' && (
          <TouchableOpacity style={styles.fabButton} onPress={startCapture}>
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <SurfaceSheet
        peekOffset={appState === 'confirming' ? SCREEN_HEIGHT - 480 : SCREEN_HEIGHT - 120}
        revealedOffset={SCREEN_HEIGHT - 480}
        expandedOffset={0}
        onStateChange={handleStateChange}
        snapToState={sheetState}
      >
        {appState === 'confirming' ? (
          <ConfirmDetailsForm onSave={handleSaveMeal} onDiscard={handleDiscardMeal} />
        ) : (
          <>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Meal History</Text>
              <Text style={styles.sheetSubtitle}>Your memories, one plate at a time</Text>
            </View>

            {meals.length === 0 ? (
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
            ) : (
              <ScrollView
                style={styles.historyList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {meals.map((meal) => {
                  const formattedCost = `₹${meal.cost}`;
                  const formattedTime = new Intl.DateTimeFormat('en-IN', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  }).format(new Date(meal.timestamp));
                  const formattedDate = new Intl.DateTimeFormat('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  }).format(new Date(meal.timestamp));

                  return (
                    <View key={meal.id} style={styles.mealItemRow}>
                      <Image source={{ uri: meal.photoUri }} style={styles.mealThumbnail} />
                      
                      <View style={styles.mealDetailsContainer}>
                        <Text style={styles.mealPlaceText} numberOfLines={1}>
                          {meal.place || formatSourceType(meal.sourceType)}
                        </Text>
                        <Text style={styles.mealMetaText}>
                          {formattedTime} • {formattedDate}
                        </Text>
                      </View>

                      <View style={styles.mealRightContainer}>
                        <Text style={styles.mealCostText}>{formattedCost}</Text>
                        {meal.duration && (
                          <Text style={styles.mealDurationText}>⏱ {meal.duration}m</Text>
                        )}
                      </View>

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteMeal(meal.id)}
                      >
                        <Text style={styles.deleteButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </>
        )}
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
  darkOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  greetingContent: {
    flex: 1,
    paddingHorizontal: Theme.layout.screenPadding,
  },
  headerContainer: {
    marginBottom: 58,
  },
  heroNumeral: {
    color: Theme.colors.canvasText,
    fontSize: Theme.typography.sizes.hero,
    fontFamily: Theme.typography.families.bold,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: -2,
    lineHeight: Theme.typography.sizes.hero + 10,
  },
  subNumeralText: {
    color: Theme.colors.canvasTextMuted,
    fontSize: 16,
    fontFamily: Theme.typography.families.regular,
    fontWeight: Theme.typography.weights.regular,
    marginTop: -4,
  },
  greetingMessageContainer: {
    maxWidth: SCREEN_WIDTH * 0.84,
  },
  eyebrow: {
    color: Theme.colors.canvasTextMuted,
    fontSize: 12,
    fontFamily: Theme.typography.families.bold,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: 1.8,
    marginBottom: 14,
  },
  emptyHeadline: {
    color: Theme.colors.canvasText,
    fontSize: 32,
    fontFamily: Theme.typography.families.bold,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: -0.8,
    lineHeight: 39,
  },
  accentText: {
    color: Theme.colors.accent,
    fontFamily: Theme.typography.families.bold,
  },
  emptySupportingText: {
    color: Theme.colors.canvasTextMuted,
    fontSize: Theme.typography.sizes.body,
    fontFamily: Theme.typography.families.regular,
    fontWeight: Theme.typography.weights.regular,
    lineHeight: 24,
    marginTop: 14,
    maxWidth: 310,
  },
  captureActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.accent,
    borderRadius: 16,
    height: 54,
    marginTop: 28,
    paddingHorizontal: 24,
    alignSelf: 'center',
    shadowColor: Theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  captureActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Theme.typography.families.bold,
    fontWeight: Theme.typography.weights.bold,
  },
  viewfinderWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * (4 / 3),
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  fabButton: {
    position: 'absolute',
    right: 24,
    bottom: 140,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontFamily: Theme.typography.families.regular,
    fontWeight: Theme.typography.weights.regular,
    marginTop: -2,
  },
  sheetHeader: {
    marginBottom: 8,
    marginTop: 8,
  },
  sheetTitle: {
    color: Theme.colors.sheetText,
    fontSize: Theme.typography.sizes.title,
    fontFamily: Theme.typography.families.bold,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: -0.5,
  },
  sheetSubtitle: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 14,
    fontFamily: Theme.typography.families.regular,
    fontWeight: Theme.typography.weights.regular,
    marginTop: 2,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 96, // Shifted down by 10%
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
    fontFamily: Theme.typography.families.bold,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: -0.3,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyHistoryBody: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 15,
    fontFamily: Theme.typography.families.regular,
    fontWeight: Theme.typography.weights.regular,
    lineHeight: 22,
    maxWidth: 320,
    textAlign: 'center',
  },
  // Camera View
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.canvasBackground,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  closeCameraButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeCameraText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Theme.typography.families.bold,
    fontWeight: 'bold',
  },
  shutterContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Theme.colors.accent,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Theme.colors.canvasBackground,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    color: Theme.colors.canvasText,
    fontSize: 22,
    fontFamily: Theme.typography.families.bold,
    fontWeight: Theme.typography.weights.bold,
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionDescription: {
    color: Theme.colors.canvasTextMuted,
    fontSize: 15,
    fontFamily: Theme.typography.families.regular,
    fontWeight: Theme.typography.weights.regular,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: Theme.colors.accent,
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Theme.typography.families.bold,
    fontWeight: Theme.typography.weights.bold,
  },
  cancelPermissionButton: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  cancelPermissionButtonText: {
    color: Theme.colors.canvasTextMuted,
    fontSize: 15,
    fontFamily: Theme.typography.families.bold,
    fontWeight: Theme.typography.weights.bold,
  },
  // Meal History List
  historyList: {
    marginTop: 12,
    flex: 1,
  },
  mealItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F0EC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  mealThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginRight: 12,
  },
  mealDetailsContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  mealPlaceText: {
    color: Theme.colors.sheetText,
    fontSize: 15,
    fontFamily: Theme.typography.families.bold,
    fontWeight: Theme.typography.weights.bold,
    marginBottom: 2,
  },
  mealMetaText: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 12,
    fontFamily: Theme.typography.families.regular,
    fontWeight: Theme.typography.weights.regular,
  },
  mealRightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: 12,
  },
  mealCostText: {
    color: Theme.colors.sheetText,
    fontSize: 15,
    fontFamily: Theme.typography.families.bold,
    fontWeight: Theme.typography.weights.bold,
    marginBottom: 2,
  },
  mealDurationText: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 12,
    fontFamily: Theme.typography.families.regular,
    fontWeight: Theme.typography.weights.regular,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E6E2DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 11,
    fontFamily: Theme.typography.families.bold,
    fontWeight: 'bold',
  },
});
