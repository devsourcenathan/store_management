import { Test, TestingModule } from '@nestjs/testing';
import { MiscTransactionsService } from './misc-transactions.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma, MiscTransactionType } from '@prisma/client';

const mockPrismaService = {
    miscTransaction: {
        create: jest.fn(),
        findMany: jest.fn(),
    },
};

describe('MiscTransactionsService', () => {
    let service: MiscTransactionsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MiscTransactionsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<MiscTransactionsService>(MiscTransactionsService);
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a misc transaction', async () => {
            const mockResult = {
                id: 'uuid-1',
                storeId: 'store-1',
                organizationId: 'org-1',
                type: 'IN',
                amount: new Prisma.Decimal(5000),
                description: 'Test addition',
                createdBy: 'user-1',
                date: new Date(),
                createdAt: new Date(),
            };

            mockPrismaService.miscTransaction.create.mockResolvedValue(mockResult);

            const result = await service.create(
                {
                    storeId: 'store-1',
                    type: 'IN' as any, // using any because MiscTransactionTypeEnum is defined in dto but mapped to prisma enum
                    amount: 5000,
                    description: 'Test addition',
                },
                'user-1',
                'org-1',
            );

            expect(mockPrismaService.miscTransaction.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    storeId: 'store-1',
                    organizationId: 'org-1',
                    type: 'IN',
                    description: 'Test addition',
                    createdBy: 'user-1',
                }),
            });

            expect(result.amount.toNumber()).toBe(5000);
            expect(result.type).toBe('IN');
        });
    });

    describe('findAll', () => {
        it('should return all transactions for an organization', async () => {
            const mockTransactions = [
                {
                    id: 'uuid-1',
                    organizationId: 'org-1',
                    amount: new Prisma.Decimal(5000),
                    type: 'IN',
                    createdAt: new Date(),
                },
            ];

            mockPrismaService.miscTransaction.findMany.mockResolvedValue(mockTransactions);

            const result = await service.findAll({ organizationId: 'org-1' });

            expect(mockPrismaService.miscTransaction.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { organizationId: 'org-1' },
                }),
            );
            expect(result).toHaveLength(1);
        });

        it('should filter by type', async () => {
            mockPrismaService.miscTransaction.findMany.mockResolvedValue([]);

            await service.findAll({ organizationId: 'org-1', type: 'OUT' as MiscTransactionType });

            expect(mockPrismaService.miscTransaction.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ type: 'OUT' }),
                }),
            );
        });
    });

    describe('getSummary', () => {
        it('should correctly compute totalIn, totalOut, and netMisc', async () => {
            mockPrismaService.miscTransaction.findMany.mockResolvedValue([
                { type: 'IN', amount: new Prisma.Decimal(10000) },
                { type: 'OUT', amount: new Prisma.Decimal(2000) },
                { type: 'IN', amount: new Prisma.Decimal(5000) },
            ]);

            const summary = await service.getSummary('org-1');

            expect(summary.totalIn).toBe(15000);
            expect(summary.totalOut).toBe(2000);
            expect(summary.netMisc).toBe(13000);
            expect(summary.count).toBe(3);
        });
    });
});
