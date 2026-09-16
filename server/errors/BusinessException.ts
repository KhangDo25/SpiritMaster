export class BusinessException extends Error {
  public statusCode: number;
  public errorCode: string;

  constructor(message: string, statusCode: number = 400, errorCode: string = "BUSINESS_ERROR") {
    super(message);
    this.name = "BusinessException";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Error.captureStackTrace(this, this.constructor);
  }
}
