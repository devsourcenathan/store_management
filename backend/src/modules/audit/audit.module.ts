import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { PrismaAuditLogRepository } from './repositories/prisma-audit-log.repository';
import { DynamoDbAuditLogRepository } from './repositories/dynamodb-audit-log.repository';

@Module({
    controllers: [AuditController],
    providers: [
        AuditService,
        PrismaAuditLogRepository,
        DynamoDbAuditLogRepository,
        {
            provide: 'IAuditLogRepository',
            useFactory: (prismaRepo: PrismaAuditLogRepository, dynamoRepo: DynamoDbAuditLogRepository) => {
                const useDynamo = process.env.AUDIT_STORAGE_TYPE === 'DYNAMODB';
                return useDynamo ? dynamoRepo : prismaRepo;
            },
            inject: [PrismaAuditLogRepository, DynamoDbAuditLogRepository]
        }
    ],
    exports: [AuditService],
})
export class AuditModule { }