import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UpdateReserveTransactionDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsEnum(['EXPENSE', 'PROJECTION', 'ADJUSTMENT'] as const)
  type?: 'EXPENSE' | 'PROJECTION' | 'ADJUSTMENT';

  @IsOptional()
  @IsEnum(['POSTED', 'PLANNED', 'CANCELLED'] as const)
  status?: 'POSTED' | 'PLANNED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount?: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  transactionDate?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  expectedDate?: string | null;
}
