/**
* 特殊的错误返回信息
*/
const CodeEnum = {
 
  ACCOUNT_REPEAT: {
    code: 250001,
    message: '账号已经存在'
  },
  ACCOUNT_UNREGISTER: {
    code: 250002,
    message: '账号不存在'
  },
  ACCOUNT_PWD_ERROR: {
    code: 250003,
    message: '账号或者密码错误'
  },
  ACCOUNT_UNLOGIN: {
    code: 250004,
    message: '账号未登录'
  },
  PARAMETER_VALIDATION_FAILED: {
    code: 250005,
    message: '参数校验失败'
  },
  TOO_MANY_REQUESTS: {
    code: 250006,
    status: 'rate_limited',
    message: '操作过于频繁，请稍后再试'
  },
  TOKEN_INVALID: {
    code: 250007,
    message: '令牌无效'
  },
  TOKEN_EXPIRED: {
    code: 250008,
    message: '令牌已过期'
  },
  TOKEN_NOT_FOUND: {
    code: 250009,
    message: '令牌未找到'
  },
  TOKEN_REFRESH_FAILED: {
    code: 250010,
    message: '令牌刷新失败'
  },
  REFRESH_TOKEN_INVALID: {
    code: 250011,
    message: '刷新令牌无效'
  },
  DEVICE_NOT_FOUND: {
    code: 250012,
    status: 'device_not_found',
    message: '设备不存在或被禁用'
  },
  DEVICE_REGISTRATION_FAILED: {
    code: 250013,
    message: '设备注册失败'
  },
  DEVICE_UPDATE_FAILED: {
    code: 250014,
    message: '设备更新失败'
  },
  DEVICE_DUPLICATE: {
    code: 250015,
    message: '设备重复'
  },
  PRODUCT_REGISTRATION_FAILED: {
    code: 250016,
    message: '产品注册失败'
  },
  PRODUCT_NOT_FOUND: {
    code: 250017,
    message: '产品不存在或被禁用'
  },
  PRODUCT_DUPLICATE: {
    code: 250018,
    message: '产品重复'
  },
  PARAMETER_SIGN_FAILED: {
    code: 250019,
    message: '签名校验失败'
  },
  AUTHENTICATION_FAILED: {
    code: 250020,
    status: 'unauthorized',
    message: '鉴权失败，禁止操作'
  },
  DEVICE_AUTHORIZATION_FAILED: {
    code: 250021,
    message: '设备授权失败'
  },
  DEVICE_UNAUTHORIZATION_FAILED: {
    code: 250022,
    message: '设备解除授权失败'
  },
}

export { CodeEnum }
 