export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errorCode?: string;
}

export function apiResponse<T>(success: boolean, message: string, data?: T, errorCode?: string): ApiResponse<T> {
  return {
    success,
    message,
    data,
    errorCode
  };
}
