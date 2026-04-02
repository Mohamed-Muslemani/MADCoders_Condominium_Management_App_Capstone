import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export enum DocumentType {
  CONDO_DOC = 'CONDO_DOC',
  RULES_GENERAL = 'RULES_GENERAL',
  RULES_BOARD = 'RULES_BOARD',
  MEETING_MINUTES = 'MEETING_MINUTES',
}

export enum DocumentVisibility {
  PUBLIC = 'PUBLIC',
  OWNERS_ONLY = 'OWNERS_ONLY',
  BOARD_ONLY = 'BOARD_ONLY',
}

export class UpdateDocumentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(DocumentType)
  @IsOptional()
  docType?: DocumentType;

  @IsEnum(DocumentVisibility)
  @IsOptional()
  visibility?: DocumentVisibility;

  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}