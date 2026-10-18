import { Dimensions, Platform } from 'react-native';

// The height the app actually draws into. Android apps are edge-to-edge, so the
// root view spans the full screen (under the status and navigation bars), while
// Dimensions' "window" height leaves those bars out. Using the window height for
// full-screen layouts leaves a gap the size of the bars.
export const SCREEN_HEIGHT =
  Platform.OS === 'android' ? Dimensions.get('screen').height : Dimensions.get('window').height;
