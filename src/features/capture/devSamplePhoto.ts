import { Asset } from 'expo-asset';
import * as Device from 'expo-device';

// Emulators and simulators have no real camera, so development builds swap in
// bundled food photos to exercise the capture flow. Never active in release builds.
export const shouldUseSamplePhoto = __DEV__ && !Device.isDevice;

const SAMPLE_PHOTOS = [
  require('../../../assets/avocado_toast.jpg'),
  require('../../../assets/chicken_salad.jpg'),
  require('../../../assets/ramen_bowl.jpg'),
];

let nextSampleIndex = 0;

// Resolves the next sample photo (cycling) to a local file URI, matching what
// takePictureAsync would hand back.
export const takeSamplePhotoAsync = async (): Promise<string | null> => {
  const module = SAMPLE_PHOTOS[nextSampleIndex];
  nextSampleIndex = (nextSampleIndex + 1) % SAMPLE_PHOTOS.length;

  const [asset] = await Asset.loadAsync(module);
  return asset.localUri ?? asset.uri;
};
