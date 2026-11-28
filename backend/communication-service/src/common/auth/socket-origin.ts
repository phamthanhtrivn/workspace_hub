function allowedOrigin(origin: string | undefined): boolean {
  // Native/server clients have no Origin. Browser origins must be explicitly configured.
  if (origin === undefined) return true;
  const configured =
    process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_URL || '';
  return configured.split(',').some((value) => {
    try {
      return new URL(value.trim()).origin === origin;
    } catch {
      return false;
    }
  });
}

export const socketCorsOptions = {
  credentials: true,
  origin(
    origin: string | undefined,
    callback: (error: Error | null, allowed: boolean) => void,
  ): void {
    callback(null, allowedOrigin(origin));
  },
};

export function allowSocketRequest(
  request: { headers: { origin?: string } },
  callback: (error: string | null, allowed: boolean) => void,
): void {
  const allowed = allowedOrigin(request.headers.origin);
  callback(allowed ? null : 'Origin not allowed', allowed);
}
