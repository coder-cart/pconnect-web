import { avatarToneForName } from '@/lib/avatar-tone';

describe('avatarToneForName', () => {
  it('returns a stable color for the same name', () => {
    expect(avatarToneForName('Alex Rivera')).toEqual(
      avatarToneForName('Alex Rivera'),
    );
  });

  it('is case-insensitive', () => {
    expect(avatarToneForName('Alex')).toEqual(avatarToneForName('alex'));
  });

  it('varies across different names', () => {
    expect(avatarToneForName('Alex')).not.toEqual(avatarToneForName('Blake'));
  });
});
