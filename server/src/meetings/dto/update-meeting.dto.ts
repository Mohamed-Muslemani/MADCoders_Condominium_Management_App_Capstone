import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateMeetingDto {
  @IsDateString()
  @IsOptional()
  meetingDate?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
