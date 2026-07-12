import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class ReorderListDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  movieIds: string[];
}
