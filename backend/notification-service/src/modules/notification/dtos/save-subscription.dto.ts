import { IsNotEmpty, IsString, IsObject, ValidateNested, Matches, MaxLength } from "class-validator";
import { Type } from 'class-transformer';

export class SubscriptionKeysDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9_-]{87}={0,2}$/)
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9_-]{22}={0,2}$/)
  auth: string;
}

export class SaveSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  endpoint: string;

  @IsObject()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => SubscriptionKeysDto)
  keys: SubscriptionKeysDto;
}
