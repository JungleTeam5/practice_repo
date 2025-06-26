// src/screens/VideoPreviewScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, Button, Dimensions } from 'react-native';
import Video from 'react-native-video'; // react-native-video 임포트
import { StackScreenProps } from '@react-navigation/stack'; // 내비게이션 타입 임포트

// Stack Navigator의 라우트 파라미터 타입을 정의합니다.
// 이 화면으로 올 때 전달될 수 있는 파라미터가 있다면 여기에 정의합니다.
type RootStackParamList = {
  FFmpegTest: undefined;
  VideoPreview: undefined;
  SideBySideScreen: undefined;
};

// 화면 컴포넌트의 props 타입을 정의합니다.
type VideoPreviewScreenProps = StackScreenProps<RootStackParamList, 'VideoPreview'>;

const VideoPreviewScreen: React.FC<VideoPreviewScreenProps> = ({ navigation }) => {
  // Xcode에 추가한 비디오 파일의 이름으로 변경하세요.
  const videoFileName = 'assetscatvideo.mp4'; // 또는 'beachvideo.mp4'
  const videoSource = require('../../assets/videos/assetscatvideo.mp4');

  // const bundledVideoSource = { uri: 'catvideo.mp4' }; // Xcode에 직접 추가한 파일

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Video Preview Screen</Text>
      <Video
        source={videoSource} // 비디오 소스 (Xcode에 추가한 파일 이름)
        // source={require('../../catvideo.mp4')} // 또는 이런 식으로 상대 경로 임포트
        style={styles.videoPlayer}
        controls={true} // 비디오 컨트롤러 표시
        resizeMode="contain" // 비디오 크기 조절 모드
        repeat={true} // 반복 재생
        onLoad={() => console.log('Video loaded')}
        onError={(error) => console.log('Video error:', error)}
      />
      <Button
        title="Go to FFmpeg Test Screen"
        onPress={() => navigation.navigate('FFmpegTest')}
      />
      <Button
        title="Go to Side-by-Side Test"
        onPress={() => navigation.navigate('SideBySideScreen')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  videoPlayer: {
    width: Dimensions.get('window').width * 0.9, // 화면 너비의 90%
    height: Dimensions.get('window').width * 0.9 * (9 / 16), // 16:9 비율 (예시)
    backgroundColor: 'black',
    marginBottom: 20,
  },
});

export default VideoPreviewScreen;