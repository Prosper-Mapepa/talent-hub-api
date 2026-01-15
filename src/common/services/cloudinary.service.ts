import { Injectable } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import { cloudinaryConfig } from '../../config/cloudinary.config';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinaryConfig();
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto', // Automatically detect image, video, or raw
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error('Upload failed with no error or result'));
          }
        },
      );

      // Upload the file buffer
      uploadStream.end(file.buffer);
    });
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string = 'uploads',
  ): Promise<UploadApiResponse[]> {
    return Promise.all(files.map((file) => this.uploadFile(file, folder)));
  }

  async deleteFile(publicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async deleteFileByUrl(url: string): Promise<void> {
    // Extract public_id from Cloudinary URL
    const publicId = this.extractPublicIdFromUrl(url);
    if (publicId) {
      return this.deleteFile(publicId);
    }
  }

  private extractPublicIdFromUrl(url: string): string | null {
    // Cloudinary URLs format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{transformations}/{version}/{public_id}.{format}
    // We need to extract the public_id
    try {
      const urlParts = url.split('/');
      const uploadIndex = urlParts.findIndex((part) => part === 'upload');
      if (uploadIndex === -1) return null;

      // Get everything after 'upload' and before the file extension
      const afterUpload = urlParts.slice(uploadIndex + 1);
      // Remove version if present (v1234567890)
      const versionIndex = afterUpload.findIndex((part) =>
        part.startsWith('v'),
      );
      const publicIdParts =
        versionIndex !== -1 ? afterUpload.slice(versionIndex + 1) : afterUpload;

      // Join and remove file extension
      let publicId = publicIdParts.join('/');
      const lastDot = publicId.lastIndexOf('.');
      if (lastDot !== -1) {
        publicId = publicId.substring(0, lastDot);
      }

      return publicId;
    } catch (error) {
      console.error('Error extracting public_id from URL:', error);
      return null;
    }
  }
}
