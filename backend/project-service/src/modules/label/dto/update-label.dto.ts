import { OptionalField } from '../../../common/optional-field.decorator';
import { IsHexColor, IsString, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../../../common/trim.decorator';

export class UpdateLabelDto {
  @OptionalField()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @OptionalField()
  @IsHexColor()
  color?: string;
}
