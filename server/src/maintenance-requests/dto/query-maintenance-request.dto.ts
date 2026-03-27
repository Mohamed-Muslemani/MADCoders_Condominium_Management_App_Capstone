import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class QueryMaintenanceRequestDto {
  @IsOptional()
  @IsEnum(['UNIT', 'BUILDING'] as const)
  scope?: 'UNIT' | 'BUILDING';

  @IsOptional()
  @IsEnum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'] as const)
  status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'] as const)
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsString()
  submittedByUserId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number;
}
