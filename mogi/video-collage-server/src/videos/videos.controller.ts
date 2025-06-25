// src/videos/videos.controller.ts

import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  Res,
  HttpException,
  HttpStatus,
  Logger,
  Body,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { VideosService } from './videos.service';
import { Response } from 'express';
import * as fs from 'fs';
import { diskStorage } from 'multer'; // 👈 multer에서 diskStorage를 직접 임포트합니다.
import * as path from 'path';

class EditDataDto {
  editData: string; // JSON 문자열로 받음
}

interface EQBand {
  id: string;
  frequency: number;
  gain: number;
}

export interface TrimmerEditData {
  startTime: number;
  endTime: number;
  volume: number;
  aspectRatio: string;
  equalizer: EQBand[];
}
interface EditData {
  layout: string;
  trimmer1: TrimmerEditData;
  trimmer2: TrimmerEditData;
}

@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}
  private readonly logger = new Logger(VideosController.name);

  @Post('collage')
  // 👇 UseInterceptors 부분을 아래와 같이 수정합니다.
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'video1', maxCount: 1 },
        { name: 'video2', maxCount: 1 },
      ],
      {
        // 👇 여기에 storage 설정을 직접 주입합니다.
        storage: diskStorage({
          destination: (req, file, cb) => {
            const uploadPath = './uploads';
            if (!fs.existsSync(uploadPath)) {
              fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
          },
          filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = path.extname(file.originalname);
            cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
          },
        }),
      },
    ),
  )
  async createCollage(
    @UploadedFiles() files: { video1?: Express.Multer.File[]; video2?: Express.Multer.File[] },
    @Body() body: EditDataDto,
    @Res() res: Response,
  ) {
    // post work1, post work2 로그는 직접 추가하신 것 같으니 그대로 두셔도 좋습니다.

    if (!files.video1 || !files.video2) {
      throw new HttpException('두 개의 영상 파일이 모두 필요합니다.', HttpStatus.BAD_REQUEST);
    }

    const editData = JSON.parse(body.editData) as EditData;

    // 이제 files.video1[0] 객체에는 반드시 'path' 속성이 포함될 것입니다.
    const video1 = files.video1[0];
    const video2 = files.video2[0];
    const layout = editData.layout;
    const trimmer1 = editData.trimmer1;
    const trimmer2 = editData.trimmer2;
    let outputFilePath: string = '';

    try {
      outputFilePath = await this.videosService.createCollage(
        video1,
        video2,
        layout,
        trimmer1,
        trimmer2,
      );

      const stream = fs.createReadStream(outputFilePath);
      res.setHeader('Content-Type', 'video/mp4');
      stream.pipe(res);

      stream.on('end', () => {
        this.videosService.cleanupFile(outputFilePath);
      });

      stream.on('error', (err) => {
        this.logger.error('Stream error:', err);
        this.videosService.cleanupFile(outputFilePath);
        res.end();
      });
    } catch (error) {
      if (outputFilePath) {
        this.videosService.cleanupFile(outputFilePath);
      }
      throw new HttpException(
        error.message || '영상 처리 중 서버 오류 발생',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
