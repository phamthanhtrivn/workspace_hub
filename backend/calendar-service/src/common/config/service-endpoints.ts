// Resolve at construction time, after the host environment has been loaded.
export function getServiceEndpoints() {
  return {
    user: process.env.USER_SERVICE_URL ?? 'http://localhost:8081',
    document: process.env.DOCUMENT_SERVICE_URL ?? 'http://localhost:8085',
  };
}
