import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { IFileStorageService } from '../file-storage.service.interface';

@Injectable()
export class LocalStorageAdapter implements IFileStorageService {
  private readonly logger = new Logger(LocalStorageAdapter.name);

  async uploadFile(key: string, content: Buffer): Promise<string | null> {
    this.logger.log(`Uploading file with key: ${key}`);

    const filePath = path.join(process.cwd(), 'uploads', key);
    const dir = path.dirname(filePath);

    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(filePath, content);

    return path.relative(process.cwd(), filePath);
  }

  async getFile(key: string): Promise<Buffer | null> {
    // Validate key to prevent path traversal
    if (key.includes('..')) {
      return null;
    }
    const absPath = path.isAbsolute(key) ? key : path.join(process.cwd(), key);
    try {
      const data = await fs.promises.readFile(absPath);
      return data;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return null;
      }
      throw err;
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      // Validate key to prevent path traversal
      if (key.includes('..')) {
        this.logger.warn(`Path traversal attempt detected: ${key}`);
        return false;
      }

      const absPath = path.isAbsolute(key) ? key : path.join(process.cwd(), key);
      
      // Check if file exists
      if (fs.existsSync(absPath)) {
        await fs.promises.unlink(absPath);
        this.logger.log(`Successfully deleted file: ${key}`);
        return true;
      } else {
        this.logger.warn(`File not found for deletion: ${key}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error deleting file ${key}:`, error);
      return false;
    }
  }
}
