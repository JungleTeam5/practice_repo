import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
/*
export const copyAssetToCache = async (filename: string): Promise<string> => {
    const sourcePath =
    Platform.OS === 'ios'
        ? `${RNFS.MainBundlePath}/${filename}`
        : `assets://${filename}`;

    const destPath = `${RNFS.CachesDirectoryPath}/${filename}`;

    const exists = await RNFS.exists(destPath);
    if (!exists) {
    await RNFS.copyFile(sourcePath, destPath);
    console.log(`📦 Copied ${filename} to cache`);
    }

    return destPath;
};
*/

export const copyAssetToCache = async (filename: string): Promise<string> => {
    const destPath = `${RNFS.CachesDirectoryPath}/${filename}`;

    // 캐시 경로에 이미 파일이 있는지 확인
    const existsInCache = await RNFS.exists(destPath);
    if (existsInCache) {
        console.log(`📦 ${filename} already exists in cache.`);
        return destPath;
    }

    if (Platform.OS === 'ios') {
        const sourcePath = `${RNFS.MainBundlePath}/${filename}`;
        await RNFS.copyFile(sourcePath, destPath);
        console.log(`📦 Copied ${filename} to iOS cache`);
    } else { // Android
        try {
            // `RNFS.copyFileAssets`는 `android/app/src/main/assets`에 있는 파일을 복사합니다.
            await RNFS.copyFileAssets(filename, destPath);
            console.log(`📦 Copied ${filename} from Android assets to cache`);
        } catch (error) {
            console.error(`Failed to copy ${filename} from Android assets:`, error);
            // 추가 디버깅: 파일이 android/app/src/main/assets에 정말 있는지 확인하는 로직
            const assetExists = await RNFS.existsAssets(filename);
            if (!assetExists) {
                console.error(`ERROR: ${filename} does not exist in android/app/src/main/assets!`);
            }
            throw error; // 오류를 다시 던져서 상위에서 처리하도록 합니다.
        }
    }

    return destPath;
};