import type { Request } from 'express';
import type { AccessClaims } from './access-token';

const IDENTITY_HEADERS = [
  'x-user-id',
  'x-user-email',
  'x-user-role',
  'x-user-name',
  'x-user-avatar',
] as const;

export function clearIdentityHeaders(request: Request): void {
  for (const header of IDENTITY_HEADERS) delete request.headers[header];
}

export function applyIdentityHeaders(
  request: Request,
  claims: AccessClaims,
): void {
  clearIdentityHeaders(request);
  const values = [
    claims.sub,
    claims.email,
    claims.role,
    claims.fullName,
    claims.avatarUrl,
  ];
  IDENTITY_HEADERS.forEach((header, index) => {
    const value = values[index];
    if (
      typeof value === 'string' &&
      Array.from(value).every((character) => {
        const code = character.charCodeAt(0);
        return code >= 32 && code !== 127;
      })
    )
      request.headers[header] = value;
  });
}
