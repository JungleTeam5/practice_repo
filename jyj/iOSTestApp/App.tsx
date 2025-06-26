import 'react-native-gesture-handler';

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import FFmpegTestScreen from './src/screens/FFmpegTestScreen';
import VideoPreviewScreen from './src/screens/VideoPreviewScreen';
import SideBySideScreen from './src/screens/SideBySideScreen';

type RootStackParamList = {
  FFmpegTest: undefined;
  VideoPreview: undefined;
  SideBySideScreen: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="VideoPreview">
        <Stack.Screen
          name="VideoPreview"
          component={VideoPreviewScreen}
          options={{ title: 'Video Preview' }}
        />

        <Stack.Screen 
          name="FFmpegTest"
          component={FFmpegTestScreen}
          options={{ title: 'FFmpeg Test' }}
        />

        <Stack.Screen
          name="SideBySideScreen"
          component={SideBySideScreen}
          options={{ title: 'Side-by-Side Test' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default App;