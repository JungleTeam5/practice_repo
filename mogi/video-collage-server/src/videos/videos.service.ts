// src/videos/videos.service.ts
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import { TrimmerEditData } from './videos.controller';

// FFmpeg 경로 설정 (이전 단계에서 설정한 그대로 둡니다)
const FFMPEG_PATH = '/opt/homebrew/bin/ffmpeg';
ffmpeg.setFfmpegPath(FFMPEG_PATH);

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  async createCollage(
    video1: Express.Multer.File,
    video2: Express.Multer.File,
    trimmer1: TrimmerEditData,
    trimmer2: TrimmerEditData,
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
      const filters = [
        `[0:v]trim=start=${trimmer1.startTime}:end=${trimmer1.endTime},setpts=PTS-STARTPTS[v0_trimmed]`,
        `[0:a]atrim=start=${trimmer1.startTime}:end=${trimmer1.endTime},asetpts=PTS-STARTPTS[a0_trimmed]`,
        `[1:v]trim=start=${trimmer2.startTime}:end=${trimmer2.endTime},setpts=PTS-STARTPTS[v1_trimmed]`,
        `[1:a]atrim=start=${trimmer2.startTime}:end=${trimmer2.endTime},asetpts=PTS-STARTPTS[a1_trimmed]`,
        `color=c=white:s=${bg_width}x${bg_height}[bg]`,
        `[v0_trimmed]scale=${frame_width}:${frame_height}[v0_scaled]`,
        `[v1_trimmed]scale=${frame_width}:${frame_height}[v1_scaled]`,
        `[bg][v0_scaled]overlay=x=${(bg_width / 2 - frame_width) / 2}:y=120[tmp]`,
        `[tmp][v1_scaled]overlay=x=${(bg_width / 2 - frame_width) / 2 + bg_width / 2}:y=120[v]`,
        '[a0_trimmed][a1_trimmed]amix=inputs=2[a]',
      ];

      ffmpeg()
        .input(video1.path)
        .input(video2.path)
        .complexFilter(filters)
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
