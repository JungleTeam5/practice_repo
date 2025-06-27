import React, {useRef, useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
  ActivityIndicator,
  NativeModules,
} from 'react-native';
import Video, {VideoRef} from 'react-native-video';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';
import DocumentPicker, {pick, types} from '@react-native-documents/picker';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import {
  request,
  PERMISSIONS,
  RESULTS,
  type PermissionStatus,
} from 'react-native-permissions';

const {AudioSessionModule} = NativeModules;

const App = () => {
  const {
    hasPermission: hasCameraPermission,
    requestPermission: requestCameraPermission,
  } = useCameraPermission();
  const {
    hasPermission: hasMicrophonePermission,
    requestPermission: requestMicrophonePermission,
  } = useMicrophonePermission();

  const device = useCameraDevice('front');
  const camera = useRef<Camera>(null);
  const videoPlayer = useRef<VideoRef>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(true);
  const [selectedVideoUri, setSelectedVideoUri] = useState<string | null>(null);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const checkAndRequestPermissions = async (): Promise<boolean> => {
    const cameraPermissionGranted = await requestCameraPermission();
    const microphonePermissionGranted = await requestMicrophonePermission();

    if (!cameraPermissionGranted || !microphonePermissionGranted) {
      Alert.alert(
        '권한 필요',
        '녹화를 위해 카메라와 마이크 접근 권한이 필요합니다.',
      );
      return false;
    }

    let storagePermissionResult: PermissionStatus = 'granted';

    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        storagePermissionResult = await request(
          PERMISSIONS.ANDROID.READ_MEDIA_VIDEO,
        );
      } else {
        storagePermissionResult = await request(
          PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
        );
      }
    } else if (Platform.OS === 'ios') {
      storagePermissionResult = await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
    }

    if (storagePermissionResult !== RESULTS.GRANTED) {
      Alert.alert(
        '권한 필요',
        '녹화된 영상을 갤러리에 저장하기 위해 저장 공간 권한이 필요합니다.',
      );
      return false;
    }

    return true;
  };

  useEffect(() => {
    const initialize = async () => {
      await checkAndRequestPermissions();
      setIsCheckingPermissions(false);
    };
    initialize();

    return () => {
      if (Platform.OS === 'ios' && AudioSessionModule?.deactivateAudioSession) {
        AudioSessionModule.deactivateAudioSession();
      }
    };
  }, []);

  const handleSelectVideo = async () => {
    try {
      const result = await pick({
        mode: 'open',
        type: [types.video]
      });
      setSelectedVideoUri(result[0].uri);
      setIsVideoPaused(true);
    } catch (err) {
      if (!DocumentPicker.isErrorWithCode(err)) {
        console.error('Document Picker 에러:', err);
      }
    }
  };

  const handleRecordButtonPress = async () => {
    if (!camera.current || isLoading) return;

    if (isRecording) {
      setIsLoading(true);
      try {
        await camera.current.stopRecording();
      } catch (e) {
        console.error('녹화 중지 실패: ', e);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const hasAllPermissions = await checkAndRequestPermissions();
    if (!hasAllPermissions) return;

    try {
      setIsLoading(true);

      if (Platform.OS === 'ios' && AudioSessionModule?.activateAudioSession) {
        await AudioSessionModule.activateAudioSession();
      }

      setIsRecording(true);
      setIsVideoPaused(false);

      camera.current.startRecording({
        onRecordingFinished: async video => {
          console.log('녹화 완료:', video);
          setIsRecording(false);
          setIsVideoPaused(true);
          videoPlayer.current?.seek(0);

          if (
            Platform.OS === 'ios' &&
            AudioSessionModule?.deactivateAudioSession
          ) {
            AudioSessionModule.deactivateAudioSession();
          }

          try {
            await CameraRoll.save(video.path, {type: 'video'});
            Alert.alert('녹화 완료', '영상이 갤러리에 저장되었습니다!');
          } catch (saveError) {
            console.error('영상 저장 실패:', saveError);
            Alert.alert('오류', '영상을 갤러리에 저장하는 데 실패했습니다.');
          }
        },
        onRecordingError: error => {
          console.error('녹화 중 에러 발생:', error);
          Alert.alert('오류', '녹화 중 문제가 발생했습니다.');
          setIsRecording(false);
          setIsVideoPaused(true);
          if (
            Platform.OS === 'ios' &&
            AudioSessionModule?.deactivateAudioSession
          ) {
            AudioSessionModule.deactivateAudioSession();
          }
        },
      });
    } catch (error) {
      console.error('녹화 시작 에러:', error);
      Alert.alert('오류', '녹화를 시작하는 중 문제가 발생했습니다.');
      setIsRecording(false);
      setIsVideoPaused(true);
    } finally {
      setIsLoading(false);
    }
  };

  const isPermissionsGranted = hasCameraPermission && hasMicrophonePermission;

  if (isCheckingPermissions) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.infoText}>권한을 확인 중입니다...</Text>
      </SafeAreaView>
    );
  }

  if (!isPermissionsGranted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.infoText}>
            합주 녹화를 위해 카메라와 마이크 권한이 필요합니다.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const videoProps = Platform.select({
    ios: {
      mixWithOthers: 'mix' as const,
      disableAudioSessionManagement: true,
    },
    android: {},
  });

  return (
    <SafeAreaView style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.infoText}>처리 중입니다...</Text>
        </View>
      )}
      <View style={styles.topContainer}>
        {selectedVideoUri ? (
          <Video
            ref={videoPlayer}
            source={{uri: selectedVideoUri}}
            style={styles.videoPlayer}
            paused={isVideoPaused}
            resizeMode="contain"
            repeat={true}
            muted={false}
            {...videoProps}
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>
              합주할 동영상을 불러와주세요.
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={handleSelectVideo}>
              <Text style={styles.buttonText}>내 휴대폰에서 동영상 찾기</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <View style={styles.bottomContainer}>
        {/* [해결책] 카메라를 제어하기 위한 래퍼 View */}
        <View style={styles.cameraWrapper}>
          {device ? (
            <Camera
              ref={camera}
              style={styles.cameraView}
              device={device}
              isActive={true}
              video={true}
              audio={true}
            />
          ) : (
            <Text style={styles.infoText}>사용 가능한 카메라가 없습니다.</Text>
          )}
        </View>
      </View>
      {selectedVideoUri && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.recordButton}
            onPress={handleRecordButtonPress}>
            <View
              style={
                isRecording ? styles.recordIconStop : styles.recordIconStart
              }
            />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  topContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomContainer: {
    flex: 1,
    backgroundColor: '#111',
  },
  cameraWrapper: {
    flex: 1,
    overflow: 'hidden', // 이 부분이 핵심입니다.
  },
  cameraView: {
    flex: 1,
  },
  videoPlayer: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {color: 'white', fontSize: 16, marginBottom: 20},
  selectButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#007AFF',
  },
  infoText: {color: 'white', fontSize: 18, textAlign: 'center', marginTop: 20},
  controlsContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  recordIconStart: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E53935',
  },
  recordIconStop: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#E53935',
  },
  buttonText: {color: 'white', fontSize: 16, fontWeight: 'bold'},
});

export default App;