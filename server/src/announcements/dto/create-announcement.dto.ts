import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const)
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
