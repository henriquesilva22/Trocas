import { IsArray, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';
import { InspectionChecklist } from '../../domain/inspection-checklist.types';

export class SubmitInspectionResultDto {
  @IsObject()
  checklist: InspectionChecklist;

  @IsArray()
  @IsUrl({}, { each: true })
  photoUrls: string[];

  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ApproveInspectionDto extends SubmitInspectionResultDto {
  @IsUrl()
  reportUrl: string;

  @IsString()
  shelfLocation: string;

  @IsString()
  sealCode: string;
}
