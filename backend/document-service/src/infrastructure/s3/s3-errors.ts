interface S3RequestError {
  name?: string;
  Code?: string;
  code?: string;
  $metadata?: {
    httpStatusCode?: number;
    requestId?: string;
  };
}

export function s3FailureDetails(error: unknown) {
  const failure = (error ?? {}) as S3RequestError;

  return {
    providerCode:
      failure.Code ?? failure.code ?? failure.name ?? 'UnknownError',
    httpStatus: failure.$metadata?.httpStatusCode,
    requestId: failure.$metadata?.requestId,
  };
}

export function isMissingS3Object(error: unknown): boolean {
  const failure = s3FailureDetails(error);

  return (
    failure.httpStatus === 404 &&
    ['NotFound', 'NoSuchKey'].includes(failure.providerCode)
  );
}
