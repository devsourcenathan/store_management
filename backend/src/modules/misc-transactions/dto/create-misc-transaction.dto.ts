import { IsEnum, IsNumber, IsOptional, IsString, Min, IsDateString } from 'class-validator';
import { MiscTransactionType } from '@prisma/client';

export class CreateMiscTransactionDto {
  @IsOptional()
  @IsString()
  storeId?: string;

  @IsEnum(MiscTransactionType)
  type: MiscTransactionType;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  description: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
