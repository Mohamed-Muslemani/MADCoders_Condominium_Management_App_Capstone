import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateUnitDueDto {
  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsDateString()
  periodMonth?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsEnum(['UNPAID', 'PAID', 'WAIVED'] as const)
  status?: 'UNPAID' | 'PAID' | 'WAIVED';

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  emailNotifiedAt?: string | null;

  @IsOptional()
  @IsDateString()
  paidDate?: string | null;
}
