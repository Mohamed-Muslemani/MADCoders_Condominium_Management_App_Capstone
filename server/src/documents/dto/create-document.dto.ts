import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  title: string;

  @IsEnum(
    ['CONDO_DOC', 'RULES_GENERAL', 'RULES_BOARD', 'MEETING_MINUTES'] as const,
  )
  docType: 'CONDO_DOC' | 'RULES_GENERAL' | 'RULES_BOARD' | 'MEETING_MINUTES';

  @IsEnum(['PUBLIC', 'OWNERS_ONLY', 'BOARD_ONLY'] as const)
  visibility: 'PUBLIC' | 'OWNERS_ONLY' | 'BOARD_ONLY';

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
