import {
    IsUUID,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsDateString,
    MaxLength,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCashAdjustmentDto {
    @IsUUID()
    @IsNotEmpty()
    storeId: string;

    @IsOptional()
    @IsDateString()
    date?: string;

    @Type(() => Number)
    @IsNumber()
    @Min(0, { message: 'Le montant attendu doit être positif ou nul' })
    expected: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0, { message: 'Le montant compté doit être positif ou nul' })
    counted: number;

    @IsOptional()
    @IsString()
    @MaxLength(500, { message: 'La raison ne doit pas dépasser 500 caractères' })
    reason?: string;
}
