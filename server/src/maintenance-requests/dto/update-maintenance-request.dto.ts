import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateMaintenanceRequestDto {
  @IsOptional()
  @IsEnum(['UNIT', 'BUILDING'] as const)
  scope?: 'UNIT' | 'BUILDING';

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  unitId?: string | null;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'] as const)
  status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'] as const)
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}
