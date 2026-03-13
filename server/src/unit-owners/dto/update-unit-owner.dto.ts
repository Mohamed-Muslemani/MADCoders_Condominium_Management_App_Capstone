import {
  IsDateString,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UpdateUnitOwnerDto {
  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  endDate?: string | null;
}
