import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Button,
  Alert,
  Platform,
} from 'react-native';

const Colors = {
  darker: '#121212',
  lighter: '#FFFFFF',
};
import { FFmpegKit, ReturnCode, Session } from 'ffmpeg-kit-react-native';

function FFmpegTestScreen(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [ffmpegOutput, setFfmpegOutput] = useState<string>('FFmpeg Output will appear here.');

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };
  
  const testExtractMetadata = async (): Promise<void> => {
    setFfmpegOutput('Running FFmpeg metadata extraction...');
    try {
      // 절대 경로 사용
      const inputPath = '/Users/yz/Documents/iOSTest/ffmpegTest/ios/catvideo.mp4';
      const command = `-i ${inputPath} -hide_banner -f null -`;
      console.log('FFmpeg Command:', command);

      const session: Session = await FFmpegKit.execute(command);
      const returnCode = await session.getReturnCode();

      if (ReturnCode.isSuccess(returnCode)) {
        const output = await session.getOutput();
        setFfmpegOutput(`Metadata Extraction Success:\n${output}`);
        Alert.alert('Metadata Test', 'Successfully extracted metadata (check output).');
      } else if (ReturnCode.isCancel(returnCode)) {
        setFfmpegOutput('Metadata Extraction Cancelled.');
        Alert.alert('Metadata Test', 'Metadata extraction was cancelled.');
      } else {
        const error = await session.getOutput();
        setFfmpegOutput(`Metadata Extraction Failed:\nCode: ${returnCode.getValue()}\nError: ${error || 'No error output.'}`);
        Alert.alert('Metadata Test', `Metadata extraction failed.\nCode: ${returnCode.getValue()}\nError: ${error || 'No error output.'}`);
      }
    } catch (e: any) {
      setFfmpegOutput(`Error during metadata extraction: ${e.message || 'Unknown error'}`);
      Alert.alert('Error', `Failed to run metadata extraction: ${e.message || 'Unknown error'}`);
    }
  };

  const runFFmpegTest = async (): Promise<void> => {
    setFfmpegOutput('Running FFmpeg command...');
    try {
      const command = '-version';
      const session: Session = await FFmpegKit.execute(command);
      const returnCode = await session.getReturnCode();

      if (ReturnCode.isSuccess(returnCode)) {
        const output = await session.getOutput();
        setFfmpegOutput(`FFmpeg Test Success:\n${output}`);
        Alert.alert('FFmpeg Test', 'FFmpeg command executed successfully!');
      } else if (ReturnCode.isCancel(returnCode)) {
        setFfmpegOutput('FFmpeg Test Cancelled.');
        Alert.alert('FFmpeg Test', 'FFmpeg command was cancelled.');
      } else {
        const error = await session.getOutput();
        setFfmpegOutput(`FFmpeg Test Failed:\nCode: ${returnCode.getValue()}\nError: ${error || 'No error output.'}`);
        Alert.alert('FFmpeg Test', `FFmpeg command failed.\nCode: ${returnCode.getValue()}\nError: ${error || 'No error output.'}`);
      }
    } catch (e: any) {
      setFfmpegOutput(`Error running FFmpeg: ${e.message || 'Unknown error'}`);
      Alert.alert('Error', `Failed to run FFmpeg test: ${e.message || 'Unknown error'}`);
    }
  };

  const styles = StyleSheet.create({
    sectionContainer: {
      marginTop: 32,
      paddingHorizontal: 24,
    },
    sectionTitle: {
      fontSize: 24,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 20,
    },
    buttonContainer: {
      marginBottom: 20,
    },
    ffmpegOutputText: {
      marginTop: 10,
      padding: 10,
      backgroundColor: '#f0f0f0',
      borderColor: '#ccc',
      borderWidth: 1,
      borderRadius: 5,
      minHeight: 100,
      fontFamily: 'Menlo',
    },
  });

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>FFmpeg Metadata Test</Text>
          <View style={styles.buttonContainer}>
            <Button title="Extract Video Metadata" onPress={testExtractMetadata} />
          </View>
          <Text style={styles.ffmpegOutputText}>{ffmpegOutput}</Text>
          {/* 이전 버전 테스트 버튼 유지 */}
          <View style={styles.buttonContainer}>
            <Button title="Run FFmpeg Version Check" onPress={runFFmpegTest} />
          </View>
          <Text style={styles.ffmpegOutputText}>{ffmpegOutput}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default FFmpegTestScreen;