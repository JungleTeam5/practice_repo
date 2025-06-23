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

    // 디버깅 로그는 이제 필요하면 사용하고, 원치 않으면 지우셔도 됩니다.
    this.logger.debug(`Video 1 Path: ${video1.path}`);
    this.logger.debug(`Video 2 Path: ${video2.path}`);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(video1.path)
        .input(video2.path)
        .complexFilter([
          // 👇 이 필터로 교체하여 높이가 다른 비디오를 자동으로 처리합니다.
          // 1. 첫 번째 비디오의 높이를 1080px로 조절 (가로세로 비율 유지) -> 결과 이름 [v0]
          // 2. 두 번째 비디오의 높이를 1080px로 조절 (가로세로 비율 유지) -> 결과 이름 [v1]
          // 3. 높이가 통일된 [v0]와 [v1]을 옆으로 붙임 -> 최종 비디오 결과 [v]
          '[0:v]scale=-2:1080[v0];[1:v]scale=-2:1080[v1];[v0][v1]hstack=inputs=2[v]',
          
          // 오디오는 첫 번째 비디오의 것을 사용합니다.
          '[0:a]apad[a]',
        ])
        .map('[v]')
        .map('[a]')
        .outputOptions('-c:v', 'libx264')
        .outputOptions('-preset', 'fast')
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
          reject(new InternalServerErrorException(`비디오 처리 중 오류 발생: ${err.message}`));
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