import { Test, TestingModule } from '@nestjs/testing';
import { CashAdjustmentsService } from './cash-adjustments.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

const mockPrismaService = {
    cashAdjustment: {
        create: jest.fn(),
        findMany: jest.fn(),
    },
};

describe('CashAdjustmentsService', () => {
    let service: CashAdjustmentsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CashAdjustmentsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<CashAdjustmentsService>(CashAdjustmentsService);
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should calculate difference and create adjustment', async () => {
            const mockResult = {
                id: 'uuid-1',
                storeId: 'store-1',
                organizationId: 'org-1',
                expected: new Prisma.Decimal(150000),
                counted: new Prisma.Decimal(148500),
                difference: new Prisma.Decimal(-1500),
                reason: 'Erreur de monnaie',
                createdBy: 'user-1',
                date: new Date(),
                createdAt: new Date(),
            };

            mockPrismaService.cashAdjustment.create.mockResolvedValue(mockResult);

            const result = await service.create(
                {
                    storeId: 'store-1',
                    expected: 150000,
                    counted: 148500,
                    reason: 'Erreur de monnaie',
                },
                'user-1',
                'org-1',
            );

            expect(mockPrismaService.cashAdjustment.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    storeId: 'store-1',
                    organizationId: 'org-1',
                    createdBy: 'user-1',
                }),
            });

            const callArgs = mockPrismaService.cashAdjustment.create.mock.calls[0][0].data;
            expect(callArgs.difference.toString()).toBe('-1500');
            expect(result.difference.toNumber()).toBe(-1500);
        });

        it('should set difference to positive when counted > expected (surplus)', async () => {
            const mockResult = {
                id: 'uuid-2',
                storeId: 'store-1',
                organizationId: 'org-1',
                expected: new Prisma.Decimal(100000),
                counted: new Prisma.Decimal(102000),
                difference: new Prisma.Decimal(2000),
                reason: null,
                createdBy: 'user-1',
                date: new Date(),
                createdAt: new Date(),
            };

            mockPrismaService.cashAdjustment.create.mockResolvedValue(mockResult);

            const result = await service.create(
                { storeId: 'store-1', expected: 100000, counted: 102000 },
                'user-1',
                'org-1',
            );

            const callArgs = mockPrismaService.cashAdjustment.create.mock.calls[0][0].data;
            expect(callArgs.difference.toString()).toBe('2000');
        });
    });

    describe('findAll', () => {
        it('should return all adjustments for an organization', async () => {
            const mockAdjustments = [
                {
                    id: 'uuid-1',
                    organizationId: 'org-1',
                    difference: new Prisma.Decimal(-1500),
                    createdAt: new Date(),
                },
            ];

            mockPrismaService.cashAdjustment.findMany.mockResolvedValue(mockAdjustments);

            const result = await service.findAll({ organizationId: 'org-1' });

            expect(mockPrismaService.cashAdjustment.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { organizationId: 'org-1' },
                }),
            );
            expect(result).toHaveLength(1);
        });

        it('should filter by storeId when provided', async () => {
            mockPrismaService.cashAdjustment.findMany.mockResolvedValue([]);

            await service.findAll({ organizationId: 'org-1', storeId: 'store-1' });

            expect(mockPrismaService.cashAdjustment.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ storeId: 'store-1' }),
                }),
            );
        });
    });

    describe('getSummary', () => {
        it('should correctly compute surplus, deficit, and net difference', async () => {
            mockPrismaService.cashAdjustment.findMany.mockResolvedValue([
                { difference: new Prisma.Decimal(2000) },
                { difference: new Prisma.Decimal(-1500) },
                { difference: new Prisma.Decimal(500) },
            ]);

            const summary = await service.getSummary('org-1');

            expect(summary.totalSurplus).toBe(2500);
            expect(summary.totalDeficit).toBe(1500);
            expect(summary.netDifference).toBe(1000);
            expect(summary.count).toBe(3);
        });
    });
});
