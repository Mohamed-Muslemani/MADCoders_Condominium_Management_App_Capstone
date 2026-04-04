import { IsString, MaxLength, MinLength } from 'class-validator';

const MAX_QUERY_LENGTH = 1000;

export class AskDocumentsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_QUERY_LENGTH)
  query: string;
}
