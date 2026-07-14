import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Theme } from '../theme';

interface ConfirmDetailsFormProps {
  onSave: (details: {
    cost: number;
    place: string | null;
    sourceType: 'home_cooked' | 'takeout' | 'dine_out' | null;
    duration: number | null;
  }) => void;
  onDiscard: () => void;
}

export const ConfirmDetailsForm: React.FC<ConfirmDetailsFormProps> = ({
  onSave,
  onDiscard,
}) => {
  const [costText, setCostText] = useState('');
  const [place, setPlace] = useState('');
  const [sourceType, setSourceType] = useState<'home_cooked' | 'takeout' | 'dine_out' | null>('home_cooked');
  const [duration, setDuration] = useState<number>(30); // Default 30 mins

  const handleSave = () => {
    const cost = parseFloat(costText.replace(/[^0-9.]/g, '')) || 0;
    onSave({
      cost,
      place: place.trim() || null,
      sourceType,
      duration,
    });
  };

  const incrementDuration = () => setDuration((prev) => Math.min(prev + 5, 240));
  const decrementDuration = () => setDuration((prev) => Math.max(prev - 5, 5));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Add Details</Text>
          <TouchableOpacity style={styles.dismissButton} onPress={onDiscard}>
            <Text style={styles.dismissButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>

        {/* Cost Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>HOW MUCH DID IT COST?</Text>
          <View style={styles.costInputWrapper}>
            <Text style={styles.currencyPrefix}>₹</Text>
            <TextInput
              style={styles.costInput}
              placeholder="0"
              placeholderTextColor={Theme.colors.sheetTextMuted}
              keyboardType="decimal-pad"
              value={costText}
              onChangeText={setCostText}
            />
          </View>
        </View>

        {/* Place Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>WHERE DID YOU GET IT FROM?</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Home, Kitchen, Olive Garden"
            placeholderTextColor={Theme.colors.sheetTextMuted}
            value={place}
            onChangeText={setPlace}
          />
        </View>

        {/* Source Type Selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>WHAT TYPE OF MEAL WAS IT?</Text>
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                sourceType === 'home_cooked' && styles.segmentButtonActive,
              ]}
              onPress={() => setSourceType('home_cooked')}
            >
              <Text
                style={[
                  styles.segmentText,
                  sourceType === 'home_cooked' && styles.segmentTextActive,
                ]}
              >
                Home Cooked
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentButton,
                sourceType === 'takeout' && styles.segmentButtonActive,
              ]}
              onPress={() => setSourceType('takeout')}
            >
              <Text
                style={[
                  styles.segmentText,
                  sourceType === 'takeout' && styles.segmentTextActive,
                ]}
              >
                Takeout
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentButton,
                sourceType === 'dine_out' && styles.segmentButtonActive,
              ]}
              onPress={() => setSourceType('dine_out')}
            >
              <Text
                style={[
                  styles.segmentText,
                  sourceType === 'dine_out' && styles.segmentTextActive,
                ]}
              >
                Dine Out
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Duration Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>HOW LONG DID IT TAKE?</Text>
          <View style={styles.stepperContainer}>
            <TouchableOpacity style={styles.stepperButton} onPress={decrementDuration}>
              <Text style={styles.stepperButtonText}>-</Text>
            </TouchableOpacity>
            <View style={styles.stepperValueContainer}>
              <Text style={styles.stepperValue}>{duration}</Text>
              <Text style={styles.stepperUnit}>mins</Text>
            </View>
            <TouchableOpacity style={styles.stepperButton} onPress={incrementDuration}>
              <Text style={styles.stepperButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Meal</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    color: Theme.colors.sheetText,
    fontSize: 20,
    fontFamily: Theme.typography.families.bold,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: -0.3,
  },
  dismissButton: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  dismissButtonText: {
    color: Theme.colors.accent,
    fontSize: 15,
    fontFamily: Theme.typography.families.bold,
    fontWeight: Theme.typography.weights.bold,
  },
  inputGroup: {
    marginBottom: 22,
  },
  label: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 11,
    fontFamily: Theme.typography.families.bold,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  costInputWrapper: {
    alignItems: 'center',
    backgroundColor: '#F3F0EC',
    borderRadius: 14,
    flexDirection: 'row',
    height: 54,
    paddingHorizontal: 16,
  },
  currencyPrefix: {
    color: Theme.colors.sheetText,
    fontSize: 20,
    fontFamily: Theme.typography.families.bold,
    fontWeight: Theme.typography.weights.bold,
    marginRight: 6,
  },
  costInput: {
    color: Theme.colors.sheetText,
    flex: 1,
    fontSize: 20,
    fontFamily: Theme.typography.families.bold,
    fontWeight: Theme.typography.weights.bold,
    height: '100%',
    padding: 0,
  },
  textInput: {
    backgroundColor: '#F3F0EC',
    borderRadius: 14,
    color: Theme.colors.sheetText,
    fontSize: 16,
    fontFamily: Theme.typography.families.regular,
    fontWeight: Theme.typography.weights.regular,
    height: 54,
    paddingHorizontal: 16,
  },
  segmentContainer: {
    backgroundColor: '#F3F0EC',
    borderRadius: 14,
    flexDirection: 'row',
    height: 54,
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: Theme.colors.sheetBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 13,
    fontFamily: Theme.typography.families.bold,
    fontWeight: Theme.typography.weights.bold,
  },
  segmentTextActive: {
    color: Theme.colors.sheetText,
  },
  stepperContainer: {
    alignItems: 'center',
    backgroundColor: '#F3F0EC',
    borderRadius: 14,
    flexDirection: 'row',
    height: 54,
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  stepperButton: {
    alignItems: 'center',
    backgroundColor: Theme.colors.sheetBackground,
    borderRadius: 10,
    height: 42,
    justifyContent: 'center',
    width: 42,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  stepperButtonText: {
    color: Theme.colors.sheetText,
    fontSize: 20,
    fontFamily: Theme.typography.families.bold,
    fontWeight: Theme.typography.weights.bold,
  },
  stepperValueContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  stepperValue: {
    color: Theme.colors.sheetText,
    fontSize: 18,
    fontFamily: Theme.typography.families.bold,
    fontWeight: Theme.typography.weights.bold,
  },
  stepperUnit: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 14,
    fontFamily: Theme.typography.families.regular,
    fontWeight: Theme.typography.weights.regular,
    marginLeft: 4,
  },
  actionContainer: {
    marginTop: 10,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: Theme.colors.accent,
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: Theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Theme.typography.families.bold,
    fontWeight: Theme.typography.weights.bold,
  },
});
