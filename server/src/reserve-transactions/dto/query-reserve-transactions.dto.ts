import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryReserveTransactionsDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(['EXPENSE', 'PROJECTION'] as const)
  type?: 'EXPENSE' | 'PROJECTION';

  @IsOptional()
  @IsEnum(['POSTED', 'PLANNED', 'CANCELLED'] as const)
  status?: 'POSTED' | 'PLANNED' | 'CANCELLED';

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
