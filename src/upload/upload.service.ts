import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

@Injectable()
export class UploadService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION') || 'ap-northeast-2',
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
    this.bucketName = this.configService.get('AWS_S3_BUCKET_NAME') || 'portlink-uploads';
  }

  async uploadFile(file: Buffer, originalName: string, mimeType: string) {
    const fileExtension = originalName.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExtension}`;
    const key = `uploads/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: mimeType,
    });

    await this.s3Client.send(command);

    return {
      key,
      url: `https://${this.bucketName}.s3.amazonaws.com/${key}`,
      fileName: originalName,
    };
  }

  async getSignedUrl(key: string, expiresIn = 3600) {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });
    return { url };
  }

  async getPresignedUploadUrl(fileName: string, contentType: string) {
    const fileExtension = fileName.split('.').pop();
    const key = `uploads/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${crypto.randomUUID()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });

    return {
      uploadUrl: url,
      key,
      publicUrl: `https://${this.bucketName}.s3.amazonaws.com/${key}`,
    };
  }
}
