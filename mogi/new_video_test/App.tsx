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
import DocumentPicker from 'react-native-document-picker';

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

  useEffect(() => {
    const checkPermissions = async () => {
      await requestCameraPermission();
      await requestMicrophonePermission();
      setIsCheckingPermissions(false);
    };
    checkPermissions();

    return () => {
      // 앱 종료 시, 이전에 세션이 활성화 되었다면 비활성화
      if (AudioSessionModule.deactivateAudioSession) {
        AudioSessionModule.deactivateAudioSession();
      }
    };
  }, [requestCameraPermission, requestMicrophonePermission]);

  const handleSelectVideo = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.video],
      });
      // 비디오를 선택하면 다른 설정 없이 바로 URI만 저장합니다.
      setSelectedVideoUri(result[0].uri);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('사용자가 비디오 선택을 취소했습니다.');
      } else {
        console.error('Document Picker 에러:', err);
      }
    }
  };

  const handleRecordButtonPress = async () => {
    if (!camera.current) return;

    // --- 녹화 중지 로직 ---
    if (isRecording) {
      try {
        await camera.current.stopRecording();
        if (AudioSessionModule.deactivateAudioSession) {
            AudioSessionModule.deactivateAudioSession();
        }
      } catch (e) {
        console.error("녹화 중지 실패: ", e);
      }
      setIsRecording(false);
      setIsVideoPaused(true);
      videoPlayer.current?.seek(0);
      return;
    }

    // --- 녹화 시작 로직 ---
    try {
      setIsLoading(true);
      // 1. [핵심] 녹화 시작 직전에만 오디오 세션을 활성화합니다.
      await AudioSessionModule.activateAudioSession();
      console.log('JS: 네이티브 오디오 세션 활성화 성공.');

      setIsRecording(true);
      setIsVideoPaused(false);
      
      // 2. [핵심] startRecording 호출 시 audio: true 옵션을 전달합니다.
      camera.current.startRecording({
        audio: true, 
        onRecordingFinished: video => {
          console.log('녹화 완료:', video);
          Alert.alert('녹화 완료', `영상이 저장되었습니다:\n${video.path}`);
          if (AudioSessionModule.deactivateAudioSession) {
            AudioSessionModule.deactivateAudioSession();
          }
        },
        onRecordingError: error => {
          console.error('녹화 중 에러 발생:', error);
          Alert.alert('오류', '녹화 중 문제가 발생했습니다.');
          if (AudioSessionModule.deactivateAudioSession) {
            AudioSessionModule.deactivateAudioSession();
          }
        },
      });

    } catch (error) {
      console.error('오디오 세션 활성화 또는 녹화 시작 에러:', error);
      Alert.alert('오류', '녹화를 시작하거나 오디오를 준비하는 중 문제가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const isPermissionsReady = hasCameraPermission && hasMicrophonePermission;

  if (isCheckingPermissions) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.infoText}>권한을 확인 중입니다...</Text>
      </SafeAreaView>
    );
  }

  if (!isPermissionsReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.infoText}>합주 녹화를 위해 카메라와 마이크 권한이 필요합니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.infoText}>녹화를 준비 중입니다...</Text>
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
            mixWithOthers="mix"
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>합주할 동영상을 불러와주세요.</Text>
            <TouchableOpacity style={styles.selectButton} onPress={handleSelectVideo}>
              <Text style={styles.buttonText}>내 휴대폰에서 동영상 찾기</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <View style={styles.bottomContainer}>
        {device ? (
          <Camera
            ref={camera}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            video={true}
            // 3. [핵심] 평상시에는 Camera가 오디오 세션에 관여하지 않도록 false로 설정합니다.
            audio={false} 
          />
        ) : (
          <Text style={styles.infoText}>사용 가능한 카메라가 없습니다.</Text>
        )}
      </View>
      {selectedVideoUri && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.recordButton}
            onPress={handleRecordButtonPress}>
            <View style={isRecording ? styles.recordIconStop : styles.recordIconStart} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', justifyContent: 'center' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10, justifyContent: 'center', alignItems: 'center' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  topContainer: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  bottomContainer: { flex: 1, backgroundColor: '#111' },
  videoPlayer: { ...StyleSheet.absoluteFillObject },
  placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: 'white', fontSize: 16, marginBottom: 20 },
  selectButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, backgroundColor: '#007AFF' },
  infoText: { color: 'white', fontSize: 18, textAlign: 'center', marginTop: 20 },
  controlsContainer: { position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 20, left: 0, right: 0, alignItems: 'center' },
  recordButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'white' },
  recordIconStart: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E53935' },
  recordIconStop: { width: 28, height: 28, borderRadius: 4, backgroundColor: '#E53935' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default App;
