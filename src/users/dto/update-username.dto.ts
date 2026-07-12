import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ProfilePrivacy } from '@prisma/client';
import { isValidUsername, normalizeUsername } from '../../common/utils/username.util';

export class UpdateUsernameDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  static validate(username: string): string {
    const normalized = normalizeUsername(username);
    if (!isValidUsername(normalized)) {
      throw new Error('Username inválido');
    }
    return normalized;
  }
}

export class UpdatePrivacyDto {
  @IsEnum(ProfilePrivacy)
  privacy: ProfilePrivacy;
}
