// src/videos/videos.service.ts
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';

// FFmpeg 경로 설정 (이전 단계에서 설정한 그대로 둡니다)
const FFMPEG_PATH = '/opt/homebrew/bin/ffmpeg';
ffmpeg.setFfmpegPath(FFMPEG_PATH);

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  async createCollage(
    video1: Express.Multer.File,
    video2: Express.Multer.File,
  ): Promise<string> {
    const outputPath = path.join('./processed', `collage-${Date.now()}.mp4`);
    const processedDir = path.dirname(outputPath);

    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }

    const bg_width = 1280;
    const bg_height = 1280;
    const frame_width = 600;
    const frame_height = 600;

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(video1.path)
        .input(video2.path)
        .complexFilter([
          // 1. 1280x1280 크기의 검은 배경 생성, 이름표: [bg]
          `color=c=white:s=${bg_width}x${bg_height}[bg]`,

          // 3. 첫 번째 복제본을 줄이고 [v1] 이름표 부여
          `[0:v]scale=${frame_width}:${frame_height}[v1]`,

          // 4. 두 번째 복제본도 줄이고 [v2] 이름표 부여
          `[1:v]scale=${frame_width}:${frame_height}[v2]`,

          // 5. 검은 배경[bg] 위에 첫 번째 영상[v1]을 위치에 올리고 [tmp] 이름표 부여
          `[bg][v1]overlay=x=${(bg_width / 2 - frame_width) / 2}:y=120[tmp]`,

          // 6. 바로 위 결과물[tmp] 위에 두 번째 영상[v2]을 위치에 올리고 최종 비디오 [v] 이름표 부여
          `[tmp][v2]overlay=x=${(bg_width / 2 - frame_width) / 2 + bg_width / 2}:y=120[v]`,

          // --- 오디오 처리 부분 (acopy 대신 amix 사용) ---
          // 1. 첫 번째 오디오([0:a])와 두 번째 오디오([1:a])를 입력으로 받음
          // 2. 2개의 입력을(inputs=2) 가장 긴 길이를 기준으로(duration=longest) 믹싱
          // 3. 그 결과에 [a] 라는 이름표를 붙임
          '[0:a][1:a]amix=inputs=2:duration=longest[a]',
        ])
        .map('[v]')
        .map('[a]')
        .outputOptions('-c:v', 'libx264')
        .outputOptions('-preset', 'fast')
        .outputOptions('-shortest')
        .on('start', (commandLine) => {
          this.logger.log('Spawned FFmpeg with command: ' + commandLine);
        })
        .on('end', () => {
          this.logger.log('FFmpeg process finished successfully.');
          this.cleanupFile(video1.path);
          this.cleanupFile(video2.path);
          resolve(outputPath);
        })
        .on('error', (err, stdout, stderr) => {
          this.logger.error('FFmpeg error:', err.message);
          this.logger.error('ffmpeg stdout:\n' + stdout);
          this.logger.error('ffmpeg stderr:\n' + stderr);
          this.cleanupFile(video1.path);
          this.cleanupFile(video2.path);
          reject(
            new InternalServerErrorException(
              `비디오 처리 중 오류 발생: ${err.message}`,
            ),
          );
        })
        .save(outputPath);
    });
  }

  cleanupFile(filePath: string) {
    fs.unlink(filePath, (err) => {
      if (err) {
        this.logger.error(`Failed to delete temporary file: ${filePath}`, err);
      } else {
        this.logger.log(`Deleted temporary file: ${filePath}`);
      }
    });
  }
}
