import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateMaintenanceRequestDto {
  @IsOptional()
  @IsEnum(['UNIT', 'BUILDING'] as const)
  scope?: 'UNIT' | 'BUILDING';

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsEnum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'] as const)
  status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'] as const)
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}
