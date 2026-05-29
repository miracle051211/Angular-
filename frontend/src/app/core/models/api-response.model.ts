export interface ApiResponse<T> {
  readonly data: T;
  readonly message: string;
  readonly error: string | null;
}
