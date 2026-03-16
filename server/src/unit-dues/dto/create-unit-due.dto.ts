import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateUnitDueDto {
  @IsString()
  unitId: string;

  @IsDateString()
  periodMonth: string;

  @IsDateString()
  dueDate: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

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
  emailNotifiedAt?: string;

  @IsOptional()
  @IsDateString()
  paidDate?: string;
}
