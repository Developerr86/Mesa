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
  isCountable,
  nutritionFor,
  portionOptions,
  searchFoods,
  type Diet,
  type Food,
} from '../foods/foodDb';
import {
  mealTypeForTime,
  totalNutrition,
  type Meal,
  type MealDetails,
  type MealItem,
  type MealSource,
  type MealType,
} from '../meals/mealStore';
import { recognizeFood, type FoodSuggestion, type Recognition } from '../recognition/recognizeFood';
import { Theme } from '../../theme';

// Dishes the classifier is at least this sure of are added to the plate; weaker ones are offered as chips
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
  // When set, the form edits this saved meal instead of logging a new one
  meal?: Meal;
  // Settings › "Ask cost for home-cooked meals"
  askCostForHomeMeals: boolean;
  onCancel: () => void;
  onRetake?: () => void;
  // capturedAt is when the photo was taken (or the saved meal's time when editing)
  onSave: (details: MealDetails, capturedAt: Date) => void;
}

const suggestionName = (suggestion: FoodSuggestion) =>
  (suggestion.dishId ? getFood(suggestion.dishId)?.name : null) ?? suggestion.label;

// An item being edited. `food` is null for tags (names that aren't in the food database).
interface DraftItem {
  key: string;
  food: Food | null;
  name: string;
  quantity: number;
  recognizedConfidence: number | null;
}

let nextDraftKey = 0;
const draftKey = () => `item-${nextDraftKey++}`;

const draftFromFood = (food: Food, recognizedConfidence: number | null = null, quantity = 1): DraftItem => ({
  key: draftKey(),
  food,
  name: food.name,
  quantity,
  recognizedConfidence,
});

// A recognised dish as a plate item. Counted foods start at the number of servings the
// detector saw ("3 rotis"); a count of katoris or bowls is left to the user.
const draftFromSuggestion = (food: Food, suggestion: FoodSuggestion) =>
  draftFromFood(food, suggestion.confidence, isCountable(food) ? (suggestion.count ?? 1) : 1);

const draftFromTag = (name: string, recognizedConfidence: number | null = null): DraftItem => ({
  key: draftKey(),
  food: null,
  name,
  quantity: 1,
  recognizedConfidence,
});

const toMealItem = (item: DraftItem): MealItem => {
  const grams = item.food ? item.food.portionGrams * item.quantity : null;
  return {
    dishId: item.food?.id ?? null,
    name: item.name,
    quantity: item.food ? item.quantity : null,
    grams,
    nutrition: item.food && grams ? nutritionFor(item.food, grams) : null,
    recognizedConfidence: item.recognizedConfidence,
  };
};

const sameItem = (item: DraftItem, suggestion: FoodSuggestion) =>
  suggestion.dishId ? item.food?.id === suggestion.dishId : item.name === suggestion.label;

export const MealDetailsScreen: React.FC<MealDetailsScreenProps> = ({
  photoUri,
  meal,
  askCostForHomeMeals,
  onCancel,
  onRetake,
  onSave,
}) => {
  const sheetRef = React.useRef<SurfaceSheetHandle>(null);
  const scrollRef = React.useRef<ScrollView>(null);
  const sectionOffsets = React.useRef<Record<string, number>>({});
  const [capturedAt] = React.useState(() => meal?.capturedAt ?? new Date());

  const [query, setQuery] = React.useState('');
  const [items, setItems] = React.useState<DraftItem[]>(() =>
    (meal?.items ?? []).map((item) => {
      const food = item.dishId ? getFood(item.dishId) : undefined;
      return {
        ...(food ? draftFromFood(food, item.recognizedConfidence) : draftFromTag(item.name, item.recognizedConfidence)),
        quantity: item.quantity ?? 1,
      };
    })
  );
  const [mealType, setMealType] = React.useState<MealType>(() => meal?.mealType ?? mealTypeForTime(capturedAt));
  const [mealSource, setMealSource] = React.useState<MealSource | null>(meal?.mealSource ?? null);
  const [cost, setCost] = React.useState(meal?.cost != null ? String(meal.cost) : '');
  const [place, setPlace] = React.useState(meal?.place ?? '');
  const [notes, setNotes] = React.useState(meal?.notes ?? '');
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const [isSheetExpanded, setIsSheetExpanded] = React.useState(false);
  // Saved meals already went through recognition; editing never re-runs it
  const [recognition, setRecognition] = React.useState<Recognition | null | 'pending'>(meal ? null : 'pending');
  const userEditedItems = React.useRef(false);

  // Run on-device recognition; add every dish it's confident about, unless the user has
  // already started building the list themselves. `skipFoodCheck` is the user overruling a
  // "doesn't look like food" verdict.
  const runRecognition = React.useCallback(
    (skipFoodCheck: boolean, isCancelled: () => boolean = () => false) => {
      setRecognition('pending');
      recognizeFood(photoUri, { skipFoodCheck }).then((result) => {
        if (isCancelled()) return;
        setRecognition(result);
        if (result?.kind !== 'food' || userEditedItems.current) return;
        const confident = result.suggestions.flatMap((suggestion) => {
          const food =
            suggestion.dishId && suggestion.confidence >= PREFILL_CONFIDENCE ? getFood(suggestion.dishId) : undefined;
          return food ? [draftFromSuggestion(food, suggestion)] : [];
        });
        if (confident.length > 0) setItems(confident);
      });
    },
    [photoUri]
  );

  React.useEffect(() => {
    if (meal) return;
    let cancelled = false;
    runRecognition(false, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [meal, runRecognition]);

  React.useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => setKeyboardHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const results = React.useMemo(
    () => searchFoods(query).filter((result) => !items.some((item) => item.food?.id === result.id)),
    [query, items]
  );
  const foodSuggestions =
    recognition && recognition !== 'pending' && recognition.kind === 'food' ? recognition.suggestions : [];
  const openSuggestions = foodSuggestions.filter(
    (suggestion) =>
      suggestion.confidence >= SUGGESTION_CONFIDENCE && !items.some((item) => sameItem(item, suggestion))
  );
  const mealItems = items.map(toMealItem);
  const nutrition = totalNutrition(mealItems);
  const showCost = mealSource !== 'home' || askCostForHomeMeals;
  const sheetTitle =
    items.length === 0
      ? meal
        ? 'Edit meal'
        : 'Log this meal'
      : items.length <= 2
        ? items.map((item) => item.name).join(', ')
        : `${items[0].name} + ${items.length - 1} more`;

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

  // The search field sits below the item cards, so scroll to the field itself (its offset
  // inside the dish section plus the section's own offset) to keep results above the keyboard.
  const focusSearch = () => {
    sheetRef.current?.snapTo('expanded');
    setTimeout(() => {
      const y = (sectionOffsets.current.dish ?? 0) + (sectionOffsets.current.dishSearch ?? 0);
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
    }, 350);
  };

  const tick = () => Haptics.selectionAsync().catch(() => {});

  const addItem = (item: DraftItem) => {
    tick();
    userEditedItems.current = true;
    setItems((current) => [...current, item]);
    setQuery('');
    Keyboard.dismiss();
    sheetRef.current?.snapTo('revealed');
  };

  const addSuggestion = (suggestion: FoodSuggestion) => {
    const food = suggestion.dishId ? getFood(suggestion.dishId) : undefined;
    addItem(food ? draftFromSuggestion(food, suggestion) : draftFromTag(suggestion.label, suggestion.confidence));
  };

  const removeItem = (key: string) => {
    tick();
    userEditedItems.current = true;
    setItems((current) => current.filter((item) => item.key !== key));
  };

  const setItemQuantity = (key: string, quantity: number) => {
    tick();
    setItems((current) => current.map((item) => (item.key === key ? { ...item, quantity } : item)));
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const parsedCost = Number.parseFloat(cost.replace(/,/g, ''));
    const topGuess = foodSuggestions[0];

    onSave(
      {
        items: mealItems,
        mealType,
        mealSource,
        cost: showCost && Number.isFinite(parsedCost) ? parsedCost : null,
        place: place.trim() || null,
        notes: notes.trim() || null,
        // Keep the original guess when editing, so it still records what the model saw
        predictedLabel: meal ? meal.predictedLabel : (topGuess?.label ?? null),
        predictedDishId: meal ? meal.predictedDishId : (topGuess?.dishId ?? null),
        predictedConfidence: meal ? meal.predictedConfidence : (topGuess?.confidence ?? null),
      },
      capturedAt
    );
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

      <Pressable
        style={styles.closeButton}
        onPress={onCancel}
        hitSlop={12}
        accessibilityLabel={meal ? 'Cancel editing' : 'Discard meal'}
      >
        <CloseGlyph />
      </Pressable>
      {onRetake ? (
        <Pressable style={styles.retakeButton} onPress={onRetake} hitSlop={8} accessibilityRole="button">
          <Text style={styles.retakeLabel}>Retake</Text>
        </Pressable>
      ) : null}

      <SurfaceSheet
        ref={sheetRef}
        title={sheetTitle}
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
          {/* Items */}
          <View onLayout={trackSection('dish')}>
            <Text style={styles.sectionLabel}>WHAT'S ON THE PLATE?</Text>

            {items.map((item) => (
              <ItemCard
                key={item.key}
                item={item}
                onRemove={() => removeItem(item.key)}
                onQuantityChange={(quantity) => setItemQuantity(item.key, quantity)}
              />
            ))}

            <View onLayout={trackSection('dishSearch')} />
            <TextInput
              style={[styles.input, items.length > 0 && styles.inputSpaced]}
              value={query}
              onChangeText={setQuery}
              onFocus={focusSearch}
              placeholder={items.length > 0 ? 'Add something else…' : 'Search dishes — dal, roti, rice…'}
              placeholderTextColor={Theme.colors.sheetTextMuted}
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (query.trim().length > 1 && results.length === 0) addItem(draftFromTag(query.trim()));
              }}
            />
            {results.map((result) => (
              <Pressable key={result.id} style={styles.resultRow} onPress={() => addItem(draftFromFood(result))}>
                <DietMark diet={result.diet} />
                <View style={styles.resultText}>
                  <Text style={styles.resultName}>{result.name}</Text>
                  <Text style={styles.resultMeta}>{describeFood(result)}</Text>
                </View>
              </Pressable>
            ))}
            {query.trim().length > 1 ? (
              <Pressable style={styles.resultRow} onPress={() => addItem(draftFromTag(query.trim()))}>
                <Text style={styles.linkLabel}>Add “{query.trim()}” as a tag</Text>
              </Pressable>
            ) : null}

            {recognition === 'pending' ? (
              <View style={styles.recognizing}>
                <ActivityIndicator size="small" color={Theme.colors.sheetTextMuted} />
                <Text style={styles.recognizingLabel}>Recognising your plate…</Text>
              </View>
            ) : null}

            {recognition && recognition !== 'pending' && recognition.kind !== 'food' && items.length === 0 && !query ? (
              <PhotoVerdict
                reason={recognition.kind === 'not_food' ? 'not_food' : recognition.reason}
                onRetake={onRetake}
                onCheckAnyway={recognition.kind === 'not_food' ? () => runRecognition(true) : undefined}
              />
            ) : null}

            {recognition && recognition !== 'pending' && recognition.kind === 'food' && !query ? (
              openSuggestions.length > 0 ? (
                <SuggestionChips
                  title={items.length > 0 ? 'ALSO ON THE PLATE?' : 'LOOKS LIKE'}
                  suggestions={openSuggestions}
                  onChoose={addSuggestion}
                />
              ) : items.length === 0 ? (
                <Text style={[styles.recognizingLabel, styles.unrecognized]}>
                  Couldn’t recognise a dish — search above.
                </Text>
              ) : null
            ) : null}
          </View>

          {/* Nutrition total */}
          {nutrition ? (
            <View style={styles.nutritionCard}>
              <Text style={styles.kcal}>≈ {Math.round(nutrition.kcal)} kcal</Text>
              <Text style={styles.macros}>
                {Math.round(nutrition.protein_g)} g protein · {Math.round(nutrition.carbs_g)} g carbs ·{' '}
                {Math.round(nutrition.fat_g)} g fat
              </Text>
              <Text style={styles.nutritionCaption}>
                Estimate for {mealItems.filter((item) => item.nutrition).length === 1 ? 'this dish' : 'these dishes'}
                {mealItems.some((item) => !item.nutrition) ? ' (tags not counted)' : ''} · USDA FoodData Central
              </Text>
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

          {/* Cost — skipped for home-cooked meals unless the setting asks for it */}
          {showCost ? (
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
          ) : null}

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

// One item on the plate: its name, where it came from, and (for database dishes) the portion.
const ItemCard: React.FC<{
  item: DraftItem;
  onRemove: () => void;
  onQuantityChange: (quantity: number) => void;
}> = ({ item, onRemove, onQuantityChange }) => {
  const kcal = item.food ? nutritionFor(item.food, item.food.portionGrams * item.quantity).kcal : null;
  return (
    <View style={[styles.itemCard, !item.food && styles.tagCard]}>
      <View style={styles.itemHeader}>
        <View style={styles.selectedDishText}>
          <Text style={styles.selectedDishName}>{item.name}</Text>
          <Text style={styles.selectedDishMeta}>
            {item.recognizedConfidence !== null ? 'Recognised on this phone · ' : ''}
            {item.food ? describeFood(item.food) : 'Tag · not in the food list'}
            {kcal !== null ? ` · ≈ ${Math.round(kcal)} kcal` : ''}
          </Text>
        </View>
        <Pressable onPress={onRemove} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`}>
          <Text style={styles.removeLabel}>✕</Text>
        </Pressable>
      </View>
      {item.food ? (
        <View style={[styles.chipRow, styles.itemPortions]}>
          {portionOptions(item.food).map((option) => (
            <Chip
              key={option.quantity}
              label={option.label}
              selected={option.quantity === item.quantity}
              small
              onPress={() => onQuantityChange(option.quantity)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const VERDICTS: Record<'dark' | 'blank' | 'not_food', { title: string; body: string }> = {
  dark: { title: 'Too dark to see anything', body: 'Retake in better light, or search for the dish above.' },
  blank: { title: 'Nothing in this photo', body: 'Retake with the plate in frame, or search for the dish above.' },
  not_food: { title: 'This doesn’t look like food', body: 'If it is, search for it above or check for dishes anyway.' },
};

// Shown when recognition decided the photo can't be (or isn't) food. It never blocks
// logging: search stays available, and "not food" can be overruled.
const PhotoVerdict: React.FC<{
  reason: keyof typeof VERDICTS;
  onRetake?: () => void;
  onCheckAnyway?: () => void;
}> = ({ reason, onRetake, onCheckAnyway }) => (
  <View style={styles.verdict}>
    <View style={styles.verdictRow}>
      <View style={styles.verdictText}>
        <Text style={styles.verdictTitle}>{VERDICTS[reason].title}</Text>
        <Text style={styles.verdictBody}>{VERDICTS[reason].body}</Text>
      </View>
      {onRetake ? (
        <Pressable style={styles.verdictRetake} onPress={onRetake} hitSlop={8} accessibilityRole="button">
          <Text style={styles.verdictRetakeLabel}>Retake</Text>
        </Pressable>
      ) : null}
    </View>
    {onCheckAnyway ? (
      <Pressable onPress={onCheckAnyway} hitSlop={8} accessibilityRole="button" style={styles.verdictAnyway}>
        <Text style={styles.linkLabel}>Check for dishes anyway</Text>
      </Pressable>
    ) : null}
  </View>
);

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
  small?: boolean;
  onPress: () => void;
}

const Chip: React.FC<ChipProps> = ({ label, selected, small, onPress }) => (
  <Pressable
    style={[styles.chip, small && styles.chipSmall, selected && styles.chipSelected]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected }}
  >
    <Text style={[styles.chipLabel, small && styles.chipLabelSmall, selected && styles.chipLabelSelected]}>
      {label}
    </Text>
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
  verdict: {
    borderColor: Theme.colors.sheetBorder,
    borderRadius: 16,
    borderWidth: 1.5,
    marginTop: 14,
    padding: 14,
  },
  verdictRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  verdictAnyway: {
    marginTop: 12,
  },
  verdictText: {
    flex: 1,
  },
  verdictTitle: {
    color: Theme.colors.sheetText,
    fontSize: 15,
    fontWeight: Theme.typography.weights.bold,
  },
  verdictBody: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  verdictRetake: {
    backgroundColor: Theme.colors.accent,
    borderRadius: 18,
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  verdictRetakeLabel: {
    color: Theme.colors.canvasText,
    fontSize: 14,
    fontWeight: Theme.typography.weights.bold,
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
  itemCard: {
    backgroundColor: Theme.colors.accentMuted,
    borderRadius: 16,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tagCard: {
    backgroundColor: 'transparent',
    borderColor: Theme.colors.sheetBorder,
    borderWidth: 1.5,
  },
  itemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  itemPortions: {
    marginTop: 12,
  },
  removeLabel: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 18,
    marginLeft: 12,
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
  chipSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipLabelSmall: {
    fontSize: 13,
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
