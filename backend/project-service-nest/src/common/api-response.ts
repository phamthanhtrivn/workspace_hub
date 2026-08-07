export class ApiResponse<T> {
  private constructor(
    public readonly success: boolean,
    public readonly message: string,
    public readonly data: T,
    public readonly errors: unknown = null,
    public readonly timestamp: string = new Date().toISOString(),
  ) {}

  static success<T>(data: T, message = 'Success'): ApiResponse<T> {
    return new ApiResponse(true, message, data);
  }
}
