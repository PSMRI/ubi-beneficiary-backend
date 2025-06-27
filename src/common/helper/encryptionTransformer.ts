import { ValueTransformer } from 'typeorm';
import { EncryptionService } from './encryptionService';

const encryptionService = new EncryptionService();

export const EncryptionTransformer: ValueTransformer = {
  to: (value: any) => {
    if (value === undefined || value === null) return value;
    return encryptionService.encrypt(value);
  },
  from: (value: any) => {
    if (value === undefined || value === null) return value;
    return encryptionService.decrypt(value);
  },
};
