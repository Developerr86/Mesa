import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CloseGlyph } from '../../components/CloseGlyph';
import { Theme } from '../../theme';
import { shouldUseSamplePhoto, takeSamplePhotoAsync } from './devSamplePhoto';
import { warmUpRecognizer } from '../recognition/recognizeFood';

interface CaptureScreenProps {
  onClose: () => void;
  onCapture: (photoUri: string) => void;
}

export const CaptureScreen: React.FC<CaptureScreenProps> = ({ onClose, onCapture }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // Load the food classifier while the user frames the shot
  React.useEffect(() => {
    warmUpRecognizer();
  }, []);

  const shutterScale = useSharedValue(1);
  const flashOpacity = useSharedValue(0);

  const shutterAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shutterScale.value }],
  }));

  const flashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const handleCapture = async () => {
    if (!cameraRef.current) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    shutterScale.value = withSequence(withSpring(0.85, { damping: 15 }), withSpring(1));
    flashOpacity.value = withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 180 }));

    try {
      if (shouldUseSamplePhoto) {
        const sampleUri = await takeSamplePhotoAsync();
        if (sampleUri) {
          setPhotoUri(sampleUri);
        }
        return;
      }

      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo) {
        setPhotoUri(photo.uri);
      }
    } catch {
      // Camera hardware unavailable (e.g. Simulator) or capture interrupted — stay on the viewfinder.
    }
  };

  const handleRetake = () => {
    setPhotoUri(null);
  };

  const handleConfirm = () => {
    if (photoUri) {
      onCapture(photoUri);
    }
  };

  if (photoUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />

        <Pressable style={styles.topLeftButton} onPress={handleRetake} hitSlop={12}>
          <CloseGlyph />
        </Pressable>

        <View style={styles.previewActions}>
          <Pressable style={styles.retakeButton} onPress={handleRetake}>
            <Text style={styles.retakeButtonLabel}>Retake</Text>
          </Pressable>
          <Pressable style={styles.confirmButton} onPress={handleConfirm} hitSlop={8}>
            <CheckGlyph />
          </Pressable>
        </View>
      </View>
    );
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContent}>
          <Text style={styles.eyebrow}>CAMERA ACCESS</Text>
          <Text style={styles.permissionHeadline}>Mesa needs your camera to capture meals.</Text>
          <Text style={styles.permissionBody}>
            Photos stay on your device and become the first memory in every meal you log.
          </Text>

          <Pressable style={styles.allowButton} onPress={requestPermission}>
            <Text style={styles.allowButtonLabel}>Allow Camera Access</Text>
          </Pressable>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.notNowLabel}>Not now</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <Animated.View
        style={[StyleSheet.absoluteFill, styles.flashOverlay, flashAnimatedStyle]}
        pointerEvents="none"
      />

      <Pressable style={styles.topLeftButton} onPress={onClose} hitSlop={12}>
        <CloseGlyph />
      </Pressable>

      <View style={styles.shutterRow}>
        <Pressable onPress={handleCapture} hitSlop={16}>
          <Animated.View style={[styles.shutterOuter, shutterAnimatedStyle]}>
            <View style={styles.shutterInner} />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
};

const CheckGlyph: React.FC = () => (
  <View style={styles.glyphBox}>
    <View style={styles.checkStemShort} />
    <View style={styles.checkStemLong} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.canvasBackground,
  },
  flashOverlay: {
    backgroundColor: '#FFFFFF',
  },
  topLeftButton: {
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
  glyphBox: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterRow: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: Theme.colors.canvasText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Theme.colors.accent,
  },
  previewActions: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.layout.screenPadding,
  },
  retakeButton: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 24,
    backgroundColor: 'rgba(20, 19, 18, 0.5)',
  },
  retakeButtonLabel: {
    color: Theme.colors.canvasText,
    fontSize: Theme.typography.sizes.body,
    fontWeight: Theme.typography.weights.bold,
  },
  confirmButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkStemShort: {
    position: 'absolute',
    width: 7,
    height: 2,
    borderRadius: 1,
    backgroundColor: Theme.colors.canvasText,
    left: 0,
    top: 8,
    transform: [{ rotate: '45deg' }],
  },
  checkStemLong: {
    position: 'absolute',
    width: 13,
    height: 2,
    borderRadius: 1,
    backgroundColor: Theme.colors.canvasText,
    left: 4,
    top: 6,
    transform: [{ rotate: '-45deg' }],
  },
  permissionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.layout.screenPadding * 1.5,
  },
  eyebrow: {
    color: Theme.colors.canvasTextMuted,
    fontSize: 12,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: 1.8,
    marginBottom: 14,
  },
  permissionHeadline: {
    color: Theme.colors.canvasText,
    fontSize: 28,
    fontWeight: Theme.typography.weights.bold,
    letterSpacing: -0.6,
    lineHeight: 34,
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionBody: {
    color: Theme.colors.canvasTextMuted,
    fontSize: Theme.typography.sizes.body,
    fontWeight: Theme.typography.weights.regular,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  allowButton: {
    backgroundColor: Theme.colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 28,
    marginBottom: 18,
  },
  allowButtonLabel: {
    color: Theme.colors.canvasText,
    fontSize: Theme.typography.sizes.body,
    fontWeight: Theme.typography.weights.bold,
  },
  notNowLabel: {
    color: Theme.colors.canvasTextMuted,
    fontSize: Theme.typography.sizes.body,
    fontWeight: Theme.typography.weights.regular,
  },
});
