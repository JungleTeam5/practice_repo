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
  PermissionsAndroid, // 안드로이드 권한 요청을 위해 다시 추가합니다.
} from 'react-native';
import Video, {VideoRef} from 'react-native-video';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';
import DocumentPicker from 'react-native-document-picker';
// --- NEW, MODERN, AND STANDARD LIBRARY FOR GALLERY ACCESS ---
// 1. Install this library: npm install @react-native-camera-roll/camera-roll
// 2. Link it: cd ios && npx pod-install
// 3. For iOS, add NSPhotoLibraryAddUsageDescription to your Info.plist
import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

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

  // --- 안드로이드 저장소 권한 요청 로직 (다시 필요) ---
  // 기존 함수를 아래와 같이 수정합니다.
  const checkAndRequestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      // iOS용 권한 요청 로직
      const resultOne = await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
      const resultTwo = await request(PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY);
      if (resultOne === RESULTS.GRANTED && resultTwo === RESULTS.GRANTED) {
        return true;
      } else {
        Alert.alert('권한 필요', '영상을 저장하려면 사진첩 접근 권한이 필요합니다.');
        return false;
      }
    } else { // 안드로이드 로직은 그대로 유지
      if (Platform.Version >= 33) {
        return true;
      }
      try {
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            {
                title: '저장 공간 권한 필요',
                message: '녹화된 영상을 갤러리에 저장하기 위해 권한이 필요합니다.',
                buttonPositive: '확인',
            },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
  };

  useEffect(() => {
    const checkPermissions = async () => {
      await requestCameraPermission();
      await requestMicrophonePermission();
      await checkAndRequestStoragePermission();
      setIsCheckingPermissions(false);
    };
    checkPermissions();

    return () => {
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
    
    // --- 녹화 시작 전 저장소 권한 확인 ---
    const hasStoragePermission = await checkAndRequestStoragePermission();
    if (!hasStoragePermission) {
        Alert.alert('권한 거부됨', '갤러리 접근 권한 없이는 영상을 저장할 수 없습니다.');
        return;
    }
    
    try {
      setIsLoading(true);
      await AudioSessionModule.activateAudioSession();
      console.log('JS: 네이티브 오디오 세션 활성화 성공.');

      setIsVideoPaused(false);
      
      setIsRecording(true);
      camera.current.startRecording({
        onRecordingFinished: async (video) => { 
          console.log('녹화 완료:', video);
          if (AudioSessionModule.deactivateAudioSession) {
            AudioSessionModule.deactivateAudioSession();
          }

          // --- NEW: @react-native-camera-roll/camera-roll을 사용하여 갤러리에 저장 ---
          try {
            // video.path는 'file://'로 시작하는 올바른 경로입니다.
            await CameraRoll.saveAsset(video.path, { type: 'video' });
            Alert.alert('녹화 완료', '영상이 갤러리에 저장되었습니다!');
          } catch (saveError) {
            console.error('영상 저장 실패:', saveError);
            Alert.alert('오류', '영상을 갤러리에 저장하는 데 실패했습니다.');
          }
        },
        onRecordingError: (error) => {
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
            muted={false}
            disableAudioSessionManagement={true}
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
            audio={true} 
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
