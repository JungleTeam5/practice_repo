import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

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
