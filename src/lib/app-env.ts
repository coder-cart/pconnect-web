/** Build-time app environment (baked via NEXT_PUBLIC_APP_ENV). */
export type AppEnv = 'production' | 'staging' | 'development';

export function getAppEnv(): AppEnv {
  const raw = (process.env.NEXT_PUBLIC_APP_ENV ?? '').trim().toLowerCase();
  switch (raw) {
    case 'staging':
      return 'staging';
    case 'development':
      return 'development';
    case 'production':
      return 'production';
    case '':
      return process.env.NODE_ENV === 'production' ? 'production' : 'development';
    default:
      return 'production';
  }
}

export function isStagingApp(): boolean {
  return getAppEnv() === 'staging';
}
