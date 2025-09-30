
export class HttpException extends Error {
  public status: number;
  public message: string;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.message = message;
  }
}

/**
 * 400 Bad Request 异常
 * 当客户端请求参数错误或不完整时抛出
 */
export class BadRequestException extends HttpException {
  constructor(message: string = '请求参数错误') {
    super(400, message);
  }
}


/**
 * 404 Not Found 异常
 * 当请求的资源不存在时抛出
 */
export class NotFoundException extends HttpException {
  constructor(message: string = '请求的资源不存在') {
    super(404, message);
  }
}

