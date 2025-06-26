import React, { useState } from 'react';
import { View, Text, Button, Alert, StyleSheet } from 'react-native';
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';
import RNFS from 'react-native-fs';
import { copyAssetToCache } from '../utils/fileUtils';
import Video from 'react-native-video';

const SideBySideScreen = () => {
    const [status, setStatus] = useState('대기중');
    const [outputPath, setOutputPath] = useState<string | null>(null);

    const runFFmpegCommand = async () => {
        setStatus('FFmpeg 실행 중...');
        
        // xcode 프로젝트의 'Copy Bundle Resources'에 포함된 비디오 파일 기준
        // 앱 캐시로 복사하여 파일 시스템 경로로 접근 가능하게 한다.
        const input1 = await copyAssetToCache('catvideo.mp4');
        const input2 = await copyAssetToCache('beachvideo.mp4');
        const output = `${RNFS.CachesDirectoryPath}/output.mp4`; // 결과 저장 위치

        const exists1 = await RNFS.exists(input1);
        const exists2 = await RNFS.exists(input2);
        console.log('input1 exists:', exists1);
        console.log('input2 exists:', exists2);

        const command = 
        `-y -i ${input1} -i ${input2} \
        -filter_complex "[0:v]fps=30,scale=-2:720[v0];[1:v]fps=30,scale=-2:720[v1];[v0][v1]hstack=inputs=2[v]" \
        -map "[v]" -map 0:a -map 1:a -c:v libx264 -c:a aac -crf 23 -preset ultrafast -shortest ${output}`;

        const session = await FFmpegKit.execute(command);
        const returnCode = await session.getReturnCode();
        console.log('returnCode:', returnCode.getValue());

        if (ReturnCode.isSuccess(returnCode)){
            setStatus('✅ 성공! 비디오가 합쳐졌습니다.');
            setOutputPath(output);
            Alert.alert('완료', `결과 파일 경로:\n${output}`);
        } else {
            const logs = await session.getAllLogs();
            setStatus('❌ 실패했습니다.');
            const messages = logs.map(log => log.getMessage()).join('\n');
            console.error('FFmpeg error logs:\n', messages);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.text}>비디오 합치기</Text>
            <Button title="FFmpeg 실행" onPress={runFFmpegCommand} />
            <Text style={styles.status}>{status}</Text>
            {outputPath && (
                <Video
                    source={{ uri: `file://${outputPath}` }}
                    style={{ width: 300, height: 200, marginTop: 20 }}
                    controls
                    resizeMode="contain"
                />
            )}
        </View>
    )
};

export default SideBySideScreen;


const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    text: { fontSize: 20, marginBottom: 20 },
    status: { marginTop: 20, fontSize: 14, color: 'gray' },
});