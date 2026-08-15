import { validate } from 'class-validator';
import { UpdateSpaceSettingDto } from './update-space-setting.dto';

describe('UpdateSpaceSettingDto', () => {
  it('should validate allowMemberCreateChannel as a boolean', async () => {
    const dto = new UpdateSpaceSettingDto();
    dto.allowMemberCreateChannel = true;
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation if allowMemberCreateChannel is not a boolean', async () => {
    const dto = new UpdateSpaceSettingDto();
    (dto as any).allowMemberCreateChannel = 'not-a-boolean';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should allow allowMemberCreateChannel to be optional/undefined', async () => {
    const dto = new UpdateSpaceSettingDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
