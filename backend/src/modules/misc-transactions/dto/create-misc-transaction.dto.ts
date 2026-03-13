import {
    IsUUID,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsDateString,
    IsEnum,
    MinLength,
    MaxLength,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum MiscTransactionTypeEnum {
    IN = 'IN',
    OUT = 'OUT',
}

export class CreateMiscTransactionDto {
    @IsUUID()
    @IsNotEmpty()
    storeId: string;

    @IsOptional()
    @IsDateString()
    date?: string;

    @IsEnum(MiscTransactionTypeEnum, { message: 'Le type doit être IN (entrée) ou OUT (sortie)' })
    type: MiscTransactionTypeEnum;

    @Type(() => Number)
    @IsNumber()
    @Min(1, { message: 'Le montant doit être supérieur à 0' })
    amount: number;

    @IsString()
    @IsNotEmpty({ message: 'La description est obligatoire' })
    @MinLength(3, { message: 'La description doit contenir au moins 3 caractères' })
    @MaxLength(500, { message: 'La description ne doit pas dépasser 500 caractères' })
    description: string;
}
