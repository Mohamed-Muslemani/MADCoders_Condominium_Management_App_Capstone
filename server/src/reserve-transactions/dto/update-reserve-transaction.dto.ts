import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateReserveTransactionDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsEnum(['EXPENSE', 'PROJECTION'] as const)
  type?: 'EXPENSE' | 'PROJECTION';

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
  @Min(0.01)
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
