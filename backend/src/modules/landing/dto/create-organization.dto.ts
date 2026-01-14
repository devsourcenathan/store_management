import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateOrganizationDto {
    @IsString()
    @IsNotEmpty()
    orgName: string;

    @IsString()
    @IsNotEmpty()
    ownerFirstName: string;

    @IsString()
    @IsNotEmpty()
    ownerLastName: string;

    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;

    @IsString()
    @IsNotEmpty()
    storeName: string; // Default store name
}
