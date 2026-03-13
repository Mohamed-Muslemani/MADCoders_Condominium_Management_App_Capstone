import {
  IsDateString,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CreateUnitOwnerDto {
  @IsString()
  unitId: string;

  @IsString()
  userId: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  endDate?: string | null;
}
