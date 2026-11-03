import React from 'react';
import { Platform, Pressable, StatusBar, StyleSheet, Switch, Text, View } from 'react-native';
import { SurfaceSheet } from '../../components/SurfaceSheet';
import { CloseGlyph } from '../../components/CloseGlyph';
import { SCREEN_HEIGHT } from '../../components/screen';
import type { Settings } from './settings';
import { Theme } from '../../theme';

interface SettingsScreenProps {
  settings: Settings;
  onChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onClose: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ settings, onChange, onClose }) => (
  <View style={styles.container}>
    <StatusBar barStyle="light-content" />
    <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12} accessibilityLabel="Close settings">
      <CloseGlyph />
    </Pressable>
    <Text style={styles.heading}>Settings</Text>

    <SurfaceSheet
      title="Logging"
      initialSnap="revealed"
      dragFromHeaderOnly
      expandedOffset={0}
      revealedOffset={SCREEN_HEIGHT * 0.3}
      peekOffset={SCREEN_HEIGHT - 150}
    >
      <SettingRow
        title="Ask cost for home-cooked meals"
        description="When off, Mesa skips the cost field for meals you mark as home-cooked."
        value={settings.askCostForHomeMeals}
        onValueChange={(value) => onChange('askCostForHomeMeals', value)}
      />
    </SurfaceSheet>
  </View>
);

const SettingRow: React.FC<{
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}> = ({ title, description, value, onValueChange }) => (
  <Pressable
    style={styles.row}
    onPress={() => onValueChange(!value)}
    accessibilityRole="switch"
    accessibilityState={{ checked: value }}
  >
    <View style={styles.rowText}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowDescription}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: Theme.colors.sheetBorder, true: Theme.colors.accent }}
      thumbColor={Platform.OS === 'android' ? Theme.colors.sheetBackground : undefined}
    />
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.canvasBackground,
  },
  closeButton: {
    position: 'absolute',
    top: 64,
    left: Theme.layout.screenPadding,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(247, 244, 239, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    color: Theme.colors.canvasText,
    fontSize: 40,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: -1,
    marginTop: 128,
    paddingHorizontal: Theme.layout.screenPadding,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: Theme.colors.sheetBorder,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingVertical: 18,
  },
  rowText: {
    flex: 1,
    marginRight: 16,
  },
  rowTitle: {
    color: Theme.colors.sheetText,
    fontSize: Theme.typography.sizes.body,
    fontWeight: Theme.typography.weights.bold,
  },
  rowDescription: {
    color: Theme.colors.sheetTextMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});
