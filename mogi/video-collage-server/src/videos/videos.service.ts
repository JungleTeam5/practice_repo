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
    // ✨ editData 객체로 받도록 파라미터를 통합하는 것을 추천하지만,
    // 기존 구조를 유지하기 위해 layout, trimmer1, trimmer2를 그대로 사용합니다.
    layout: string,
    trimmer1: TrimmerEditData,
    trimmer2: TrimmerEditData,
  ): Promise<string> {
    const outputPath = path.join('./processed', `collage-${Date.now()}.mp4`);
    const processedDir = path.dirname(outputPath);

    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }

    // ✨ createCollage 메소드의 인자들을 generateFilterComplex가 사용할 수 있는 editData 형태로 조합합니다.
    const editData = { layout, trimmer1, trimmer2 };

    // ✨ 하드코딩된 bg_width, bg_height 등은 generateFilterComplex 내부에서 계산하므로 삭제합니다.

    return new Promise((resolve, reject) => {
      // ✨ 1. 동적으로 필터 배열을 생성합니다.
      const dynamicFilters = this.generateFilterComplex(editData);

      // ✨ 2. 기존의 하드코딩된 filters 배열은 삭제되었습니다.

      ffmpeg()
        .input(video1.path)
        .input(video2.path)
        // ✨ 3. 생성된 동적 필터를 complexFilter에 전달합니다.
        .complexFilter(dynamicFilters)
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

  /**
   * ✨ 필터 생성 로직을 서비스 클래스의 private 메소드로 편입
   * editData 객체를 기반으로 FFmpeg filter_complex 인수를 생성합니다.
   * @param {object} editData - layout, trimmer1, trimmer2를 포함하는 객체.
   * @returns {string[]} FFmpeg -filter_complex에 사용할 필터 문자열 배열.
   */
  private generateFilterComplex(editData: {
    layout: string;
    trimmer1: TrimmerEditData;
    trimmer2: TrimmerEditData;
  }): string[] {
    const { layout, trimmer1, trimmer2 } = editData;
    const filterComplex: string[] = [];

    // --- 오디오 필터 체인 ---
    let lastAudioNode1 = '[a0_vol]';
    filterComplex.push(
      `[0:a]atrim=start=${trimmer1.startTime}:end=${trimmer1.endTime},asetpts=PTS-STARTPTS[a0_trimmed]`,
    );
    filterComplex.push(`[a0_trimmed]volume=${trimmer1.volume}[a0_vol]`);
    let eqChain1 = '[a0_vol]';
    trimmer1.equalizer.forEach((band, index) => {
      if (band.gain !== 0) {
        const currentNode = `a0_eq${index}`;
        filterComplex.push(
          `${eqChain1}equalizer=f=${band.frequency}:t=h:width_type=q:w=1.41:g=${band.gain}[${currentNode}]`,
        );
        eqChain1 = `[${currentNode}]`;
      }
    });
    lastAudioNode1 = eqChain1;

    let lastAudioNode2 = '[a1_vol]';
    filterComplex.push(
      `[1:a]atrim=start=${trimmer2.startTime}:end=${trimmer2.endTime},asetpts=PTS-STARTPTS[a1_trimmed]`,
    );
    filterComplex.push(`[a1_trimmed]volume=${trimmer2.volume}[a1_vol]`);
    let eqChain2 = '[a1_vol]';
    trimmer2.equalizer.forEach((band, index) => {
      if (band.gain !== 0) {
        const currentNode = `a1_eq${index}`;
        filterComplex.push(
          `${eqChain2}equalizer=f=${band.frequency}:t=h:width_type=q:w=1.41:g=${band.gain}[${currentNode}]`,
        );
        eqChain2 = `[${currentNode}]`;
      }
    });
    lastAudioNode2 = eqChain2;

    filterComplex.push(`${lastAudioNode1}${lastAudioNode2}amix=inputs=2[a]`);

    // --- 1. 설정값 ---
    // ✨ 모서리 둥글기 효과를 위한 반지름 값 (0으로 설정 시 효과 없음)
    const cornerRadius = 30; // 예시: 30px

    // --- 2. 비디오 필터 체인 ---

    // --- 2a. 동적 프레임 크기 계산 ---
    const ensureEven = (num) => 2 * Math.round(num / 2);

    const PADDING = 40;
    const ar_val1 = eval(trimmer1.aspectRatio.replace(':', '/'));
    const ar_val2 = eval(trimmer2.aspectRatio.replace(':', '/'));

    let bg_width, bg_height;
    let frame1_w, frame1_h, frame2_w, frame2_h;
    let x1, y1, x2, y2;

    if (layout === 'row') {
      const collage_h = 1080;
      bg_height = collage_h;
      const frame_h_common = ensureEven(collage_h - (PADDING * 2));
      frame1_h = frame_h_common;
      frame2_h = frame_h_common;
      frame1_w = ensureEven(frame1_h * ar_val1);
      frame2_w = ensureEven(frame2_h * ar_val2);
      bg_width = PADDING + frame1_w + PADDING + frame2_w + PADDING;
      x1 = PADDING; y1 = PADDING;
      x2 = PADDING + frame1_w + PADDING; y2 = PADDING;
    } else { // 'column'
      const collage_w = 1080;
      bg_width = collage_w;
      const frame_w_common = ensureEven(collage_w - (PADDING * 2));
      frame1_w = frame_w_common;
      frame2_w = frame_w_common;
      frame1_h = ensureEven(frame1_w / ar_val1);
      frame2_h = ensureEven(frame2_w / ar_val2);
      bg_height = PADDING + frame1_h + PADDING + frame2_h + PADDING;
      x1 = PADDING; y1 = PADDING;
      x2 = PADDING; y2 = PADDING + frame1_h + PADDING;
    }

    bg_width = ensureEven(bg_width);
    bg_height = ensureEven(bg_height);

    filterComplex.push(`color=c=black:s=${bg_width}x${bg_height}[bg]`);

    // --- 2b. 각 비디오 처리 ---

    // -- 첫 번째 비디오 --
    filterComplex.push(`[0:v]trim=start=${trimmer1.startTime}:end=${trimmer1.endTime},setpts=PTS-STARTPTS[v0_trimmed]`);
    filterComplex.push(`[v0_trimmed]crop=w='min(iw,ih*(${ar_val1}))':h='min(ih,iw/(${ar_val1}))',setsar=1[v0_cropped]`);
    filterComplex.push(`[v0_cropped]scale=w=${frame1_w}:h=${frame1_h}[v0_final]`);

    // ✨ 첫 번째 비디오에 둥근 모서리 적용
    if (cornerRadius > 0) {
      filterComplex.push(`color=c=black:s=${frame1_w}x${frame1_h}[mask0_base]`);
      filterComplex.push(`[mask0_base]geq=lum='if(gt(hypot(X-max(${cornerRadius},min(W-${cornerRadius},X)),Y-max(${cornerRadius},min(H-${cornerRadius},Y))),${cornerRadius}),0,255)':a=255[mask0]`);
      filterComplex.push(`[v0_final][mask0]alphamerge[v0_rounded]`);
    }

    // -- 두 번째 비디오 --
    filterComplex.push(`[1:v]trim=start=${trimmer2.startTime}:end=${trimmer2.endTime},setpts=PTS-STARTPTS[v1_trimmed]`);
    filterComplex.push(`[v1_trimmed]crop=w='min(iw,ih*(${ar_val2}))':h='min(ih,iw/(${ar_val2}))',setsar=1[v1_cropped]`);
    filterComplex.push(`[v1_cropped]scale=w=${frame2_w}:h=${frame2_h}[v1_final]`);

    // ✨ 두 번째 비디오에 둥근 모서리 적용
    if (cornerRadius > 0) {
      filterComplex.push(`color=c=black:s=${frame2_w}x${frame2_h}[mask1_base]`);
      filterComplex.push(`[mask1_base]geq=lum='if(gt(hypot(X-max(${cornerRadius},min(W-${cornerRadius},X)),Y-max(${cornerRadius},min(H-${cornerRadius},Y))),${cornerRadius}),0,255)':a=255[mask1]`);
      filterComplex.push(`[v1_final][mask1]alphamerge[v1_rounded]`);
    }

    // --- 2c. 최종 오버레이 ---
    // ✨ 둥근 모서리가 적용된 스트림(v0_rounded, v1_rounded)을 사용하도록 수정합니다.
    // cornerRadius가 0이면 원래 스트림(v0_final, v1_final)을 사용합니다.
    const finalStream0 = cornerRadius > 0 ? '[v0_rounded]' : '[v0_final]';
    const finalStream1 = cornerRadius > 0 ? '[v1_rounded]' : '[v1_final]';

    filterComplex.push(`[bg]${finalStream0}overlay=x=${x1}:y=${y1}[tmp]`);
    filterComplex.push(`[tmp]${finalStream1}overlay=x=${x2}:y=${y2}[v]`);

    return filterComplex;
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
