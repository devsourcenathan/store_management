import { IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class CreateCashAdjustmentDto {
  @IsOptional()
  @IsString()
  storeId?: string;

  @IsNumber()
  @Min(0)
  expected: number;

  @IsNumber()
  @Min(0)
  counted: number;

  @IsNumber()
  difference: number;

  @ValidateIf((o) => o.difference !== 0)
  @IsString()
  reason?: string;
}
