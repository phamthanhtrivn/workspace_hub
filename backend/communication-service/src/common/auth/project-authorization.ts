import {
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
export const PROJECT_AUTHORIZATION_PATH = '/internal/project-access/authorize';
export async function authorizeProject(
  userId: string | undefined,
  projectId: string,
  operation: 'READ' | 'EDIT_DOCUMENTS' = 'READ',
): Promise<{ owner: boolean; canEditDocuments: boolean }> {
  if (!userId) throw new ForbiddenException('Project membership required');
  const baseUrl = process.env.PROJECT_SERVICE_URL;
  const key = process.env.INTERNAL_SERVICE_KEY;
  if (!baseUrl || !key?.trim())
    throw new ServiceUnavailableException(
      'Project authorization is not configured',
    );
  let response: Response;
  try {
    response = await fetch(new URL(PROJECT_AUTHORIZATION_PATH, baseUrl), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-service-key': key,
      },
      body: JSON.stringify({ userId, projectId, operation }),
      signal: AbortSignal.timeout(5000),
      redirect: 'error',
    });
  } catch {
    throw new ServiceUnavailableException('Project authorization unavailable');
  }
  if (response.status === 403 || response.status === 404)
    throw new ForbiddenException('Project access denied');
  if (!response.ok)
    throw new ServiceUnavailableException('Project authorization unavailable');
  return (await response.json()) as {
    owner: boolean;
    canEditDocuments: boolean;
  };
}
