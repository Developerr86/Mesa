import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Theme } from '../theme';

export const CloseGlyph: React.FC = () => (
  <View style={styles.box}>
    <View style={[styles.line, { transform: [{ rotate: '45deg' }] }]} />
    <View style={[styles.line, { transform: [{ rotate: '-45deg' }] }]} />
  </View>
);

const styles = StyleSheet.create({
  box: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    position: 'absolute',
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: Theme.colors.canvasText,
  },
});
