import React, {useRef, useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
  NativeModules, // 네이티브 모듈을 사용하기 위해 임포트
} from 'react-native';
import Video, {VideoRef} from 'react-native-video';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';
import DocumentPicker from 'react-native-document-picker';

// --- 우리가 Swift로 만든 네이티브 모듈을 가져옵니다 ---
const {AudioSessionModule} = NativeModules;

// --- 메인 앱 컴포넌트 ---
const App = () => {
  // --- 권한 관련 훅 ---
  const {
    hasPermission: hasCameraPermission,
    requestPermission: requestCameraPermission,
  } = useCameraPermission();
  const {
    hasPermission: hasMicrophonePermission,
    requestPermission: requestMicrophonePermission,
  } = useMicrophonePermission();

  // --- 카메라 및 비디오 플레이어 Ref ---
  const device = useCameraDevice('front');
  const camera = useRef<Camera>(null);
  const videoPlayer = useRef<VideoRef>(null);

  // --- 상태 관리 (State) ---
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(true);
  const [selectedVideoUri, setSelectedVideoUri] = useState<string | null>(null);

  // --- 컴포넌트 마운트 시 권한 요청 ---
  useEffect(() => {
    if (!hasCameraPermission) {
      requestCameraPermission();
    }
    if (!hasMicrophonePermission) {
      requestMicrophonePermission();
    }
  }, [
    hasCameraPermission,
    hasMicrophonePermission,
    requestCameraPermission,
    requestMicrophonePermission,
  ]);

  // --- 휴대폰 저장소에서 비디오를 선택하는 함수 ---
  const handleSelectVideo = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.video],
      });
      setSelectedVideoUri(result[0].uri);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('사용자가 비디오 선택을 취소했습니다.');
      } else {
        console.error('Document Picker 에러:', err);
        Alert.alert('오류', '파일을 불러오는 중 문제가 발생했습니다.');
      }
    }
  };

  // --- 녹화 시작/중지 버튼 핸들러 (네이티브 모듈 호출 로직 포함) ---
  const handleRecordButtonPress = async () => {
    if (!camera.current) {
      Alert.alert('오류', '카메라가 준비되지 않았습니다.');
      return;
    }

    // --- 녹화 중지 로직 ---
    if (isRecording) {
      try {
        await camera.current.stopRecording();
        // stopRecording()이 완료된 후에 상태를 변경하는 것이 더 안정적일 수 있습니다.
      } catch (e) {
        console.error('녹화 중지 실패:', e);
      }
      // UI 상태는 에러 발생 여부와 상관없이 업데이트
      setIsRecording(false);
      setIsVideoPaused(true);
      videoPlayer.current?.seek(0);
      return;
    }

    // --- 녹화 시작 로직 ---
    try {
      // 1. [핵심] 녹화 시작 직전, Swift로 만든 네이티브 함수를 호출합니다.
      await AudioSessionModule.activateAudioSession();

      // 2. 위 함수가 성공적으로 완료되면(Promise가 resolve되면) 녹화를 시작합니다.
      console.log('JS: 오디오 세션 준비 완료. 녹화를 시작합니다.');
      setIsRecording(true);
      setIsVideoPaused(false); // 비디오 재생 시작
      
      camera.current.startRecording({
        onRecordingFinished: video => {
          console.log('녹화 완료:', video);
          Alert.alert('녹화 완료', `영상이 저장되었습니다:\n${video.path}`);
        },
        onRecordingError: error => {
          console.error('녹화 중 에러 발생:', error);
          setIsRecording(false);
          setIsVideoPaused(true);
          Alert.alert('오류', '녹화 중 문제가 발생했습니다.');
        },
      });

    } catch (error) {
      // activateAudioSession 함수가 실패하면(Promise가 reject되면) 이쪽으로 에러가 넘어옵니다.
      console.error('JS: 네이티브 오디오 세션 활성화 실패:', error);
      Alert.alert(
        '녹음 시작 오류',
        '오디오 세션을 활성화하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      );
    }
  };


  // 모든 권한이 허용되었는지 확인
  const isPermissionsReady = hasCameraPermission && hasMicrophonePermission;

  // --- 렌더링 ---
  return (
    <SafeAreaView style={styles.container}>
      {!isPermissionsReady ? (
        // 1. 권한이 준비되지 않았을 때의 화면
        <View style={styles.permissionContainer}>
          <Text style={styles.infoText}>
            합주 녹화를 위해 카메라와 마이크 권한이 필요합니다.
          </Text>
          <Text style={styles.infoSubText}>
            카메라 권한: {hasCameraPermission ? '✅' : '❌'}
          </Text>
          <Text style={styles.infoSubText}>
            마이크 권한: {hasMicrophonePermission ? '✅' : '❌'}
          </Text>
        </View>
      ) : (
        // 2. 권한이 모두 허용되었을 때의 메인 화면
        <>
          {/* 상단: 비디오 플레이어 영역 */}
          <View style={styles.topContainer}>
            {selectedVideoUri ? (
              <Video
                ref={videoPlayer}
                source={{uri: selectedVideoUri}}
                style={styles.videoPlayer}
                paused={isVideoPaused}
                resizeMode="contain"
                repeat={true}
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

          {/* 하단: 카메라 녹화 영역 */}
          <View style={styles.bottomContainer}>
            {device ? (
              <Camera
                ref={camera}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={true}
                video={true}
                audio={true}
              />
            ) : (
              <Text style={styles.infoText}>사용 가능한 카메라가 없습니다.</Text>
            )}
          </View>

          {/* 컨트롤 버튼: 비디오가 선택된 후에만 표시 */}
          {selectedVideoUri && (
            <View style={styles.controlsContainer}>
              <TouchableOpacity
                style={styles.recordButton}
                onPress={handleRecordButtonPress}>
                <View style={isRecording ? styles.recordIconStop : styles.recordIconStart} />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

// --- 스타일 시트 ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
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
  videoPlayer: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
  },
  selectButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#007AFF',
  },
  infoText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  infoSubText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 10,
  },
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
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default App;
