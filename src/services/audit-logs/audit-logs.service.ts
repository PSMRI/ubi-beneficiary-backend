import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog } from '@entities/audit-logs.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRespository: Repository<AuditLog>,
  ) {}

  async saveLog(
    user_id: string,
    action: string,
    action_data: Record<string, any>,
    old_data: Record<string, any>,
    new_data: Record<string, any>,
    log_transaction_text: string,
  ): Promise<void> {
    const newLog = this.auditLogRespository.create({
      user_type: 'Beneficiary',
      user_id,
      action,
      action_data,
      old_data,
      new_data,
      log_transaction_text,
      template: '',
      timestamp: new Date(),
    });

    try {
      await this.auditLogRespository.save(newLog);
    } catch (error) {
      Logger.error('Error while saving audit log: ', error);
    }
  }
}
