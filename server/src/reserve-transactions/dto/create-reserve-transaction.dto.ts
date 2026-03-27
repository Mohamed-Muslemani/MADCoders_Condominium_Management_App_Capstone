import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateReserveTransactionDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsEnum(['EXPENSE', 'PROJECTION'] as const)
  type: 'EXPENSE' | 'PROJECTION';

  @IsEnum(['POSTED', 'PLANNED', 'CANCELLED'] as const)
  status: 'POSTED' | 'PLANNED' | 'CANCELLED';

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;
}
