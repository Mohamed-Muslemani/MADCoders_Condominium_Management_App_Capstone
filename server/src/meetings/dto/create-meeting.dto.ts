import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateMeetingDto {
  @IsDateString()
  meetingDate: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  notes?: string;
}