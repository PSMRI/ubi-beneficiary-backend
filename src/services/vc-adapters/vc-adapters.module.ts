import { Module } from '@nestjs/common';
import { DhiwayVcAdapter } from './dhiway-vc.adapter';
import { VcAdapterFactory } from './vc-adapter.factory';

/**
 * Module for managing VC adapters and their factory
 * Encapsulates all VC adapter dependencies and provides clean factory interface
 */
@Module({
  providers: [
    DhiwayVcAdapter,
    VcAdapterFactory,
  ],
  exports: [VcAdapterFactory], // Only export the factory for clean interface
})
export class VcAdaptersModule {}