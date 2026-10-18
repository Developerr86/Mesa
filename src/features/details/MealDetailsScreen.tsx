import React from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { SurfaceSheet, type SurfaceSheetHandle } from '../../components/SurfaceSheet';
import { CloseGlyph } from '../../components/CloseGlyph';
import { SCREEN_HEIGHT } from '../../components/screen';
import {
  getFood,
  nutritionFor,
  portionLabel,
  portionOptions,
  searchFoods,
  type Diet,
  type Food,
} from '../foods/foodDb';
import { mealTypeForTime, type MealDetails, type MealSource, type MealType } from '../meals/mealStore';
import { recognizeFood, type FoodSuggestion, type Recognition } from '../recognition/recognizeFood';
import { Theme } from '../../theme';

// Above this the classifier's top dish is filled in; below it, guesses are only offered as chips
const PREFILL_CONFIDENCE = 0.5;
// Guesses below this are noise. The model always names some dish, even for a photo of a
// wall, so a weak best guess is also our only hint that the photo may not be food.
const SUGGESTION_CONFIDENCE = 0.1;

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'snack', label: 'Snack' },
  { value: 'dinner', label: 'Dinner' },
];

const MEAL_SOURCES: { value: MealSource; label: string }[] = [
  { value: 'home', label: 'Home-cooked' },
  { value: 'takeout', label: 'Takeout' },
  { value: 'dine_out', label: 'Dine-out' },
];

const CUISINE_LABELS: Record<string, string> = {
  north_indian: 'North Indian',
  south_indian: 'South Indian',
  pan_indian: 'Indian',
  indo_chinese: 'Indo-Chinese',
  fast_food: 'Fast food',
  middle_eastern: 'Middle Eastern',
};

const DIET_LABELS: Record<Diet, string> = { veg: 'Veg', egg: 'Egg', non_veg: 'Non-veg' };

const describeFood = (food: Food) => {
  const cuisine =
    CUISINE_LABELS[food.cuisine] ?? food.cuisine.charAt(0).toUpperCase() + food.cuisine.slice(1).replace(/_/g, ' ');
  return `${cuisine} · ${DIET_LABELS[food.diet]}`;
};

const formatTime = (date: Date) =>
  new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(date);

interface MealDetailsScreenProps {
  photoUri: string;
  onCancel: () => void;
  onRetake: () => void;
  onSave: (details: MealDetails) => void;
}

const suggestionName = (suggestion: FoodSuggestion) =>
  (suggestion.dishId ? getFood(suggestion.dishId)?.name : null) ?? suggestion.label;

export const MealDetailsScreen: React.FC<MealDetailsScreenProps> = ({ photoUri, onCancel, onRetake, onSave }) => {
  const sheetRef = React.useRef<SurfaceSheetHandle>(null);
  const scrollRef = React.useRef<ScrollView>(null);
  const sectionOffsets = React.useRef<Record<string, number>>({});
  const [capturedAt] = React.useState(() => new Date());

  const [query, setQuery] = React.useState('');
  const [food, setFood] = React.useState<Food | null>(null);
  const [customDishName, setCustomDishName] = React.useState<string | null>(null);
  const [quantity, setQuantity] = React.useState(1);
  const [mealType, setMealType] = React.useState<MealType>(() => mealTypeForTime(capturedAt));
  const [mealSource, setMealSource] = React.useState<MealSource | null>(null);
  const [cost, setCost] = React.useState('');
  const [place, setPlace] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const [isSheetExpanded, setIsSheetExpanded] = React.useState(false);
  const [recognition, setRecognition] = React.useState<Recognition | null | 'pending'>('pending');
  const [recognizedDishId, setRecognizedDishId] = React.useState<string | null>(null);
  const userPickedDish = React.useRef(false);

  // Run the on-device classifier once; prefill only when it's confident and the
  // user hasn't already chosen something themselves.
  React.useEffect(() => {
    let cancelled = false;
    recognizeFood(photoUri).then((result) => {
      if (cancelled) return;
      setRecognition(result);
      const top = result?.suggestions[0];
      const topFood = top?.dishId && top.confidence >= PREFILL_CONFIDENCE ? getFood(top.dishId) : undefined;
      if (topFood && !userPickedDish.current) {
        setFood(topFood);
        setQuantity(1);
        setRecognizedDishId(topFood.id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [photoUri]);

  React.useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => setKeyboardHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const results = React.useMemo(() => searchFoods(query), [query]);
  const grams = food ? food.portionGrams * quantity : null;
  const nutrition = food && grams ? nutritionFor(food, grams) : null;
  const hasDish = food !== null || customDishName !== null;

  // Typing needs the whole screen: expand the sheet, then bring the field into view
  // once the keyboard has opened.
  const focusSection = (section: string) => () => {
    sheetRef.current?.snapTo('expanded');
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, (sectionOffsets.current[section] ?? 0) - 24), animated: true });
    }, 350);
  };

  const trackSection = (section: string) => (event: { nativeEvent: { layout: { y: number } } }) => {
    sectionOffsets.current[section] = event.nativeEvent.layout.y;
  };

  const tick = () => Haptics.selectionAsync().catch(() => {});

  const chooseFood = (next: Food) => {
    tick();
    userPickedDish.current = true;
    setFood(next);
    setCustomDishName(null);
    setQuantity(1);
    setQuery('');
    Keyboard.dismiss();
    sheetRef.current?.snapTo('revealed');
  };

  const chooseCustomDish = (name: string) => {
    tick();
    userPickedDish.current = true;
    setFood(null);
    setCustomDishName(name);
    setQuery('');
    Keyboard.dismiss();
    sheetRef.current?.snapTo('revealed');
  };

  const chooseSuggestion = (suggestion: FoodSuggestion) => {
    const suggestedFood = suggestion.dishId ? getFood(suggestion.dishId) : undefined;
    if (suggestedFood) {
      chooseFood(suggestedFood);
    } else {
      chooseCustomDish(suggestion.label);
    }
  };

  const clearDish = () => {
    userPickedDish.current = true;
    setFood(null);
    setCustomDishName(null);
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const parsedCost = Number.parseFloat(cost.replace(/,/g, ''));
    const topGuess = recognition && recognition !== 'pending' ? recognition.suggestions[0] : undefined;

    onSave({
      dishId: food?.id ?? null,
      dishName: food?.name ?? customDishName,
      quantity: food ? quantity : null,
      grams,
      nutrition,
      mealType,
      mealSource,
      cost: Number.isFinite(parsedCost) ? parsedCost : null,
      place: place.trim() || null,
      notes: notes.trim() || null,
      predictedLabel: topGuess?.label ?? null,
      predictedDishId: topGuess?.dishId ?? null,
      predictedConfidence: topGuess?.confidence ?? null,
    });
  };

  const saveButton = (
    <Pressable
      style={styles.saveButton}
      onPress={handleSave}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Save meal"
    >
      <Text style={styles.saveButtonLabel}>Save</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        animated
        barStyle={isSheetExpanded ? 'dark-content' : 'light-content'}
        backgroundColor={isSheetExpanded ? Theme.colors.sheetBackground : Theme.colors.canvasBackground}
      />
      <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />

      <Pressable style={styles.closeButton} onPress={onCancel} hitSlop={12} accessibilityLabel="Discard meal">
        <CloseGlyph />
      </Pressable>
      <Pressable style={styles.retakeButton} onPress={onRetake} hitSlop={8} accessibilityRole="button">
        <Text style={styles.retakeLabel}>Retake</Text>
      </Pressable>

      <SurfaceSheet
        ref={sheetRef}
        title={hasDish ? (food?.name ?? customDishName ?? '') : 'Log this meal'}
        subtitle={`${formatTime(capturedAt)} · ${MEAL_TYPES.find((t) => t.value === mealType)?.label}`}
        titleAccessory={saveButton}
        initialSnap="revealed"
        onExpandedChange={setIsSheetExpanded}
        dragFromHeaderOnly
        expandedOffset={0}
        revealedOffset={SCREEN_HEIGHT * 0.42}
        peekOffset={SCREEN_HEIGHT - 150}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: keyboardHeight + SCREEN_HEIGHT * 0.45 }}
        >
          {/* Dish */}
          <View onLayout={trackSection('dish')}>
            <Text style={styles.sectionLabel}>WHAT'S ON THE PLATE?</Text>
            {hasDish ? (
              <View style={styles.selectedDish}>
                <View style={styles.selectedDishText}>
                  <Text style={styles.selectedDishName}>{food?.name ?? customDishName}</Text>
                  <Text style={styles.selectedDishMeta}>
                    {food && food.id === recognizedDishId ? 'Recognised on this phone · ' : ''}
                    {food ? describeFood(food) : 'Not in the food list'}
                  </Text>
                </View>
                <Pressable onPress={clearDish} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.linkLabel}>Change</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={query}
                  onChangeText={setQuery}
                  onFocus={focusSection('dish')}
                  placeholder="Search dishes — dal, biryani, pizza…"
                  placeholderTextColor={Theme.colors.sheetTextMuted}
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {results.map((result) => (
                  <Pressable key={result.id} style={styles.resultRow} onPress={() => chooseFood(result)}>
                    <DietMark diet={result.diet} />
                    <View style={styles.resultText}>
                      <Text style={styles.resultName}>{result.name}</Text>
                      <Text style={styles.resultMeta}>{describeFood(result)}</Text>
                    </View>
                  </Pressable>
                ))}
                {query.trim().length > 1 ? (
                  <Pressable style={styles.resultRow} onPress={() => chooseCustomDish(query.trim())}>
                    <Text style={styles.linkLabel}>Use “{query.trim()}”</Text>
                  </Pressable>
                ) : null}
              </>
            )}

            {recognition === 'pending' ? (
              <View style={styles.recognizing}>
                <ActivityIndicator size="small" color={Theme.colors.sheetTextMuted} />
                <Text style={styles.recognizingLabel}>Recognising your plate…</Text>
              </View>
            ) : null}

            {recognition && recognition !== 'pending' && !query ? (
              recognition.suggestions.some((suggestion) => suggestion.confidence >= SUGGESTION_CONFIDENCE) ? (
                <SuggestionChips
                  title={hasDish ? 'NOT RIGHT? MAYBE' : 'LOOKS LIKE'}
                  suggestions={recognition.suggestions.filter(
                    (suggestion) =>
                      suggestion.confidence >= SUGGESTION_CONFIDENCE &&
                      suggestionName(suggestion) !== (food?.name ?? customDishName)
                  )}
                  onChoose={chooseSuggestion}
                />
              ) : !hasDish ? (
                <Text style={[styles.recognizingLabel, styles.unrecognized]}>Couldn’t recognise a dish — search above.</Text>
              ) : null
            ) : null}
          </View>

          {/* Portion + nutrition estimate */}
          {food && nutrition && grams ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>HOW MUCH?</Text>
              <View style={styles.chipRow}>
                {portionOptions(food).map((option) => (
                  <Chip
                    key={option.quantity}
                    label={option.label}
                    selected={option.quantity === quantity}
                    onPress={() => {
                      tick();
                      setQuantity(option.quantity);
                    }}
                  />
                ))}
              </View>

              <View style={styles.nutritionCard}>
                <Text style={styles.kcal}>≈ {Math.round(nutrition.kcal)} kcal</Text>
                <Text style={styles.macros}>
                  {Math.round(nutrition.protein_g)} g protein · {Math.round(nutrition.carbs_g)} g carbs ·{' '}
                  {Math.round(nutrition.fat_g)} g fat
                </Text>
                <Text style={styles.nutritionCaption}>
                  Estimate for {portionLabel(food, quantity)} (~{Math.round(grams)} g) · USDA FoodData Central
                </Text>
              </View>
            </View>
          ) : null}

          {/* Meal type */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>MEAL</Text>
            <View style={styles.chipRow}>
              {MEAL_TYPES.map((type) => (
                <Chip
                  key={type.value}
                  label={type.label}
                  selected={type.value === mealType}
                  onPress={() => {
                    tick();
                    setMealType(type.value);
                  }}
                />
              ))}
            </View>
          </View>

          {/* Source */}
          <View style={styles.section} onLayout={trackSection('source')}>
            <Text style={styles.sectionLabel}>FROM</Text>
            <View style={styles.chipRow}>
              {MEAL_SOURCES.map((source) => (
                <Chip
                  key={source.value}
                  label={source.label}
                  selected={source.value === mealSource}
                  onPress={() => {
                    tick();
                    setMealSource((current) => (current === source.value ? null : source.value));
                  }}
                />
              ))}
            </View>
            {mealSource === 'takeout' || mealSource === 'dine_out' ? (
              <TextInput
                style={[styles.input, styles.inputSpaced]}
                value={place}
                onChangeText={setPlace}
                onFocus={focusSection('source')}
                placeholder={mealSource === 'takeout' ? 'Restaurant or app' : 'Restaurant'}
                placeholderTextColor={Theme.colors.sheetTextMuted}
              />
            ) : null}
          </View>

          {/* Cost */}
          <View style={styles.section} onLayout={trackSection('cost')}>
            <Text style={styles.sectionLabel}>COST</Text>
            <View style={styles.costRow}>
              <Text style={styles.currency}>₹</Text>
              <TextInput
                style={[styles.input, styles.costInput]}
                value={cost}
                onChangeText={setCost}
                onFocus={focusSection('cost')}
                placeholder="0"
                placeholderTextColor={Theme.colors.sheetTextMuted}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section} onLayout={trackSection('notes')}>
            <Text style={styles.sectionLabel}>NOTES</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              onFocus={focusSection('notes')}
              placeholder="Anything worth remembering?"
              placeholderTextColor={Theme.colors.sheetTextMuted}
              multiline
            />
          </View>
        </ScrollView>
      </SurfaceSheet>
    </View>
  );
};

const SuggestionChips: React.FC<{
  title: string;
  suggestions: FoodSuggestion[];
  onChoose: (suggestion: FoodSuggestion) => void;
}> = ({ title, suggestions, onChoose }) =>
  suggestions.length === 0 ? null : (
    <View style={styles.suggestions}>
      <Text style={styles.suggestionsTitle}>{title}</Text>
      <View style={styles.chipRow}>
        {suggestions.map((suggestion) => (
          <Chip
            key={suggestion.dishId ?? suggestion.label}
            label={`${suggestionName(suggestion)} · ${Math.round(suggestion.confidence * 100)}%`}
            selected={false}
            onPress={() => onChoose(suggestion)}
          />
        ))}
      </View>
    </View>
  );

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const Chip: React.FC<ChipProps> = ({ label, selected, onPress }) => (
  <Pressable
    style={[styles.chip, selected && styles.chipSelected]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected }}
  >
    <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
  </Pressable>
);

// The familiar Indian food-label mark: a dot inside a square, green for veg, brown for non-veg
const DietMark: React.FC<{ diet: Diet }> = ({ diet }) => {
  const color = diet === 'veg' ? '#3A8A4B' : diet === 'egg' ? '#C9A227' : '#8B3A2B';
  return (
    <View style={[styles.dietMark, { borderColor: color }]}>
      <View style={[styles.dietDot, { backgroundColor: color }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.canvasBackground,
  },
  photo: {
    height: SCREEN_HEIGHT * 0.42 + Theme.layout.deviceCornerRadius,
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
  retakeButton: {
    position: 'absolute',
    top: 64,
    right: Theme.layout.screenPadding,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 19, 18, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  retakeLabel: {
    color: Theme.colors.canvasText,
    fontSize: 15,
    fontWeight: Theme.typography.weights.bold,
  },
  recognizing: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  recognizingLabel: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 14,
  },
  suggestions: {
    marginTop: 16,
  },
  unrecognized: {
    marginTop: 14,
  },
  suggestionsTitle: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 11,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: Theme.colors.accent,
    borderRadius: 22,
    marginLeft: 12,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  saveButtonLabel: {
    color: Theme.colors.canvasText,
    fontSize: Theme.typography.sizes.body,
    fontWeight: Theme.typography.weights.bold,
  },
  section: {
    marginTop: 26,
  },
  sectionLabel: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 12,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  input: {
    backgroundColor: Theme.colors.sheetBorder,
    borderRadius: 14,
    color: Theme.colors.sheetText,
    fontSize: Theme.typography.sizes.body,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  inputSpaced: {
    marginTop: 12,
  },
  resultRow: {
    alignItems: 'center',
    borderBottomColor: Theme.colors.sheetBorder,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  resultText: {
    flex: 1,
    marginLeft: 12,
  },
  resultName: {
    color: Theme.colors.sheetText,
    fontSize: Theme.typography.sizes.body,
    fontWeight: Theme.typography.weights.bold,
  },
  resultMeta: {
    color: Theme.colors.sheetTextMuted,
    fontSize: Theme.typography.sizes.caption,
    marginTop: 2,
  },
  selectedDish: {
    alignItems: 'center',
    backgroundColor: Theme.colors.accentMuted,
    borderRadius: 16,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectedDishText: {
    flex: 1,
  },
  selectedDishName: {
    color: Theme.colors.sheetText,
    fontSize: 18,
    fontWeight: Theme.typography.weights.bold,
  },
  selectedDishMeta: {
    color: Theme.colors.sheetTextMuted,
    fontSize: Theme.typography.sizes.caption,
    marginTop: 2,
  },
  linkLabel: {
    color: Theme.colors.accent,
    fontSize: Theme.typography.sizes.body,
    fontWeight: Theme.typography.weights.bold,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderColor: Theme.colors.sheetBorder,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  chipSelected: {
    backgroundColor: Theme.colors.sheetText,
    borderColor: Theme.colors.sheetText,
  },
  chipLabel: {
    color: Theme.colors.sheetText,
    fontSize: 15,
    fontWeight: Theme.typography.weights.regular,
  },
  chipLabelSelected: {
    color: Theme.colors.sheetBackground,
    fontWeight: Theme.typography.weights.bold,
  },
  nutritionCard: {
    borderColor: Theme.colors.sheetBorder,
    borderRadius: 16,
    borderWidth: 1.5,
    marginTop: 14,
    padding: 16,
  },
  kcal: {
    color: Theme.colors.sheetText,
    fontSize: 26,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: -0.5,
  },
  macros: {
    color: Theme.colors.sheetText,
    fontSize: 15,
    marginTop: 4,
  },
  nutritionCaption: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 12,
    marginTop: 8,
  },
  costRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  currency: {
    color: Theme.colors.sheetText,
    fontSize: 22,
    fontWeight: Theme.typography.weights.bold,
    marginRight: 10,
  },
  costInput: {
    flex: 1,
  },
  notesInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  dietMark: {
    alignItems: 'center',
    borderRadius: 3,
    borderWidth: 1.5,
    height: 16,
    justifyContent: 'center',
    width: 16,
  },
  dietDot: {
    borderRadius: 3.5,
    height: 7,
    width: 7,
  },
});
