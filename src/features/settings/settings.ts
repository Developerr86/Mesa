import React from 'react';
import Storage from 'expo-sqlite/kv-store';

// User preferences, kept on-device in expo-sqlite's key-value store.
export interface Settings {
  // When off, home-cooked meals skip the cost field entirely
  askCostForHomeMeals: boolean;
}

const DEFAULTS: Settings = {
  askCostForHomeMeals: false,
};

const STORAGE_KEY = 'settings';

const readSettings = (): Settings => {
  try {
    const stored = Storage.getItemSync(STORAGE_KEY);
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
  } catch (error) {
    console.warn('Failed to read settings', error);
    return DEFAULTS;
  }
};

export const useSettings = () => {
  const [settings, setSettings] = React.useState<Settings>(readSettings);

  const updateSetting = React.useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((current) => {
      const next = { ...current, [key]: value };
      try {
        Storage.setItemSync(STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        console.warn('Failed to save settings', error);
      }
      return next;
    });
  }, []);

  return { settings, updateSetting };
};
