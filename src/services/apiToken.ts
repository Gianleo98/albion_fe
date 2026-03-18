/**
 * Token condiviso col backend (stesso default in application.properties).
 * Opzionale: VITE_API_TOKEN in build per un segreto diverso.
 */
export const DEFAULT_ALBUS_API_TOKEN =
  'AlbusIo2025SoloUsoPersonale_xK9mQ2vL7nR4wB8';

export function getApiToken(): string {
  const env = import.meta.env.VITE_API_TOKEN;
  if (typeof env === 'string' && env.trim() !== '') {
    return env.trim();
  }
  return DEFAULT_ALBUS_API_TOKEN;
}
