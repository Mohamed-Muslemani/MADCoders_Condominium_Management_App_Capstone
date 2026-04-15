import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateReserveTransactionDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsEnum(['EXPENSE', 'PROJECTION', 'ADJUSTMENT'] as const)
  type: 'EXPENSE' | 'PROJECTION' | 'ADJUSTMENT';

  @IsEnum(['POSTED', 'PLANNED', 'CANCELLED'] as const)
  status: 'POSTED' | 'PLANNED' | 'CANCELLED';

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  amount: number;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;
}
