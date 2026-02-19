import { Injectable, Logger } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { AuditLogParams, GetLogsParams } from '../audit.service';
import { IAuditLogRepository, AuditLogResult } from './audit-log.repository.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DynamoDbAuditLogRepository implements IAuditLogRepository {
    private readonly logger = new Logger(DynamoDbAuditLogRepository.name);
    private readonly tableName: string;
    private readonly docClient: DynamoDBDocumentClient;

    constructor() {
        this.tableName = process.env.DYNAMODB_TABLE_NAME || 'AuditLogs';
        const client = new DynamoDBClient({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
            }
        });
        this.docClient = DynamoDBDocumentClient.from(client, {
            marshallOptions: {
                removeUndefinedValues: true,
                convertClassInstanceToMap: true,
            }
        });
    }

    async create(params: AuditLogParams) {
        const id = uuidv4();
        const createdAt = new Date().toISOString();
        const item = {
            PK: `ORG#${params.organizationId}`,
            SK: `LOG#${createdAt}#${id}`,
            GSI1PK: `USER#${params.userId}`,
            GSI1SK: `LOG#${createdAt}`,
            GSI2PK: `ENTITY#${params.entity}#${params.entityId}`,
            GSI2SK: `LOG#${createdAt}`,
            id,
            organizationId: params.organizationId,
            userId: params.userId,
            action: params.action,
            entity: params.entity,
            entityId: params.entityId,
            changes: params.changes || {},
            method: params.method,
            status: params.status || 'SUCCESS',
            duration: params.duration,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            createdAt
        };

        try {
            await this.docClient.send(new PutCommand({
                TableName: this.tableName,
                Item: item
            }));
            return item;
        } catch (error) {
            this.logger.error(`Failed to save audit log to DynamoDB: ${error.message}`, error.stack);
            throw error;
        }
    }

    async findMany(params: GetLogsParams): Promise<AuditLogResult> {
        // In DynamoDB, complex filtering like "all logs for org, filtered by user AND entity AND action" 
        // usually requires efficient GSI design or FilterExpressions.
        // For this implementation, we will primarily query by Organization (PK) and generic filters.

        const {
            organizationId,
            userId,
            entity,
            entityId,
            action,
            status,
            startDate,
            endDate,
            limit = 50,
            offset = 0 // Offset is hard in DynamoDB (pagination uses LastEvaluatedKey), we'll do simple slice for now or ignore
        } = params;

        // Construct Query
        // We always query by PK = ORG#{orgId}
        // To support date range, we use SK between LOG#{startDate} and LOG#{endDate}

        let KeyConditionExpression = 'PK = :pk';
        const ExpressionAttributeValues: any = {
            ':pk': `ORG#${organizationId}`
        };

        if (startDate && endDate) {
            KeyConditionExpression += ' AND SK BETWEEN :start AND :end';
            ExpressionAttributeValues[':start'] = `LOG#${startDate.toISOString()}`;
            ExpressionAttributeValues[':end'] = `LOG#${endDate.toISOString()}`;
        } else if (startDate) {
            KeyConditionExpression += ' AND SK >= :start';
            ExpressionAttributeValues[':start'] = `LOG#${startDate.toISOString()}`;
        } else {
            // Default to scan backward (latest first)
            // DynamoDB sorts by SK automatically
        }

        const FilterExpressions: string[] = [];
        const ExpressionAttributeNames: any = {};

        if (userId) {
            FilterExpressions.push('#user = :user');
            ExpressionAttributeNames['#user'] = 'userId';
            ExpressionAttributeValues[':user'] = userId;
        }
        if (entity) {
            FilterExpressions.push('#entity = :entity');
            ExpressionAttributeNames['#entity'] = 'entity';
            ExpressionAttributeValues[':entity'] = entity;
        }
        if (entityId) {
            FilterExpressions.push('entityId = :entityId');
            ExpressionAttributeValues[':entityId'] = entityId;
        }
        if (action) {
            FilterExpressions.push('#action = :action');
            ExpressionAttributeNames['#action'] = 'action';
            ExpressionAttributeValues[':action'] = action;
        }
        if (status) {
            FilterExpressions.push('#status = :status');
            ExpressionAttributeNames['#status'] = 'status';
            ExpressionAttributeValues[':status'] = status;
        }

        try {
            const command = new QueryCommand({
                TableName: this.tableName,
                KeyConditionExpression,
                ExpressionAttributeValues,
                ExpressionAttributeNames: Object.keys(ExpressionAttributeNames).length > 0 ? ExpressionAttributeNames : undefined,
                FilterExpression: FilterExpressions.length > 0 ? FilterExpressions.join(' AND ') : undefined,
                ScanIndexForward: false, // Descending order
                // DynamoDB limit applies before filter, so we might get fewer results. 
                // For a robust implementation we'd need to paginate recursively.
                // For now, setting a higher limit on query and slicing in memory if we really need "limit" items
                Limit: limit * 2
            });

            const result = await this.docClient.send(command);

            // Manual pagination (slice) if needed, though DynamoDB handles it differently
            const logs = result.Items || [];

            // Map back to standard structure if needed (already matches mostly)

            return {
                logs: logs.slice(0, limit),
                total: 0, // Counting is expensive in DynamoDB
                limit,
                offset,
                hasMore: !!result.LastEvaluatedKey
            };

        } catch (error) {
            this.logger.error(`Failed to query audit logs from DynamoDB: ${error.message}`, error.stack);
            throw error;
        }
    }

    async getLogsByUser(userId: string, startDate?: Date, endDate?: Date, limit = 50): Promise<any[]> {
        // Use GSI1: USER#{userId}
        let KeyConditionExpression = 'GSI1PK = :pk';
        const ExpressionAttributeValues: any = {
            ':pk': `USER#${userId}`
        };

        if (startDate && endDate) {
            KeyConditionExpression += ' AND GSI1SK BETWEEN :start AND :end';
            ExpressionAttributeValues[':start'] = `LOG#${startDate.toISOString()}`;
            ExpressionAttributeValues[':end'] = `LOG#${endDate.toISOString()}`;
        }

        try {
            const command = new QueryCommand({
                TableName: this.tableName,
                IndexName: 'GSI1',
                KeyConditionExpression,
                ExpressionAttributeValues,
                ScanIndexForward: false,
                Limit: limit
            });

            const result = await this.docClient.send(command);
            return result.Items || [];
        } catch (error) {
            this.logger.error(error);
            return [];
        }
    }

    async getLogsByEntity(entity: string, entityId: string, limit = 50): Promise<any[]> {
        // Use GSI2: ENTITY#{entity}#{entityId}
        let KeyConditionExpression = 'GSI2PK = :pk';
        const ExpressionAttributeValues: any = {
            ':pk': `ENTITY#${entity}#${entityId}`
        };

        try {
            const command = new QueryCommand({
                TableName: this.tableName,
                IndexName: 'GSI2',
                KeyConditionExpression,
                ExpressionAttributeValues,
                ScanIndexForward: false,
                Limit: limit
            });

            const result = await this.docClient.send(command);
            return result.Items || [];
        } catch (error) {
            this.logger.error(error);
            return [];
        }
    }

    async count(params: any): Promise<number> {
        // Count is not efficiently supported with arbitrary filters without scan
        return 0;
    }

    async getAuditStats(organizationId: string, startDate?: Date, endDate?: Date): Promise<any> {
        // Fetch all logs for the period and aggregate in-memory
        // NOTE: This will be slow for large datasets. 
        // Production DynamoDB approach would be to increment counters in separate items.

        const allLogs = await this.getAllLogsForStats(organizationId, startDate, endDate);

        const totalLogs = allLogs.length;

        // Aggregations
        const actionCounts = {};
        const entityCounts = {};
        const statusCounts = {};
        const userCounts = {};
        let totalDuration = 0;
        let durationCount = 0;

        for (const log of allLogs) {
            // Action
            actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;

            // Entity
            entityCounts[log.entity] = (entityCounts[log.entity] || 0) + 1;

            // Status
            statusCounts[log.status] = (statusCounts[log.status] || 0) + 1;

            // User
            userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;

            // Duration
            if (log.duration) {
                totalDuration += log.duration;
                durationCount++;
            }
        }

        // Format for response
        const logsByAction = Object.entries(actionCounts)
            .map(([action, count]) => ({ action, count }))
            .sort((a: any, b: any) => b.count - a.count);

        const logsByEntity = Object.entries(entityCounts)
            .map(([entity, count]) => ({ entity, count }))
            .sort((a: any, b: any) => b.count - a.count);

        const logsByStatus = Object.entries(statusCounts)
            .map(([status, count]) => ({ status, count }));

        const topUsers = Object.entries(userCounts)
            .map(([userId, count]) => ({ userId, _count: { userId: count } })) // Match prisma structure roughly for easier mapping later
            .sort((a: any, b: any) => b._count.userId - a._count.userId)
            .slice(0, 10);

        const avgDuration = durationCount > 0 ? totalDuration / durationCount : 0;

        return {
            totalLogs,
            logsByAction,
            logsByEntity,
            logsByStatus,
            topUsers,
            avgDuration: { _avg: { duration: avgDuration } } // Match prisma structure
        };
    }

    private async getAllLogsForStats(organizationId: string, startDate?: Date, endDate?: Date) {
        let items = [];
        let lastEvaluatedKey = undefined;

        let KeyConditionExpression = 'PK = :pk';
        const ExpressionAttributeValues: any = {
            ':pk': `ORG#${organizationId}`
        };

        if (startDate && endDate) {
            KeyConditionExpression += ' AND SK BETWEEN :start AND :end';
            ExpressionAttributeValues[':start'] = `LOG#${startDate.toISOString()}`;
            ExpressionAttributeValues[':end'] = `LOG#${endDate.toISOString()}`;
        }

        do {
            const command = new QueryCommand({
                TableName: this.tableName,
                KeyConditionExpression,
                ExpressionAttributeValues,
                ExclusiveStartKey: lastEvaluatedKey
            });

            const result = await this.docClient.send(command);
            items = items.concat(result.Items || []);
            lastEvaluatedKey = result.LastEvaluatedKey;

        } while (lastEvaluatedKey);

        return items;
    }
}
