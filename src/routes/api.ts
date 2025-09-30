import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import requestIp from 'request-ip';
import { tokenGenerator } from '@/utils/oauth2TokenGenerator';
import { DeviceService } from '@/services/deviceService';
import { ProductService } from '@/services/productService';
import { checkTokenActionRateLimit, checkSign } from '@/utils/index';
import { CodeEnum } from '@/utils/codeEnum';
import { Code } from 'typeorm';


export class ApiRoutes {

  private deviceService: DeviceService;
  private productService: ProductService;

  constructor() {
    this.deviceService = new DeviceService();
    this.productService = new ProductService();
  }

  /**
   * 申请令牌
   * @param req 
   * @param res 
   * @returns 
   */
  async getToken(req: Request, res: Response): Promise<void> {
    // console.log('===申请令牌===')
    try {
      const { device_key } = req.body;

      // 参数校验
      const errors: string[] = [];

      if (!device_key || typeof device_key !== 'string' || device_key.trim() === '') {
        errors.push('设备密钥(device_key)为必填项，且必须是有效的字符串');
      }

      if (errors.length > 0) {
        res.status(200).json({
          ...CodeEnum.PARAMETER_VALIDATION_FAILED,
          data: errors
        });
        return;
      }

      if (!await checkTokenActionRateLimit(device_key)) {
        res.status(200).json({
          ...CodeEnum.TOO_MANY_REQUESTS,
          data: null
        });
        return;
      }

      let deviceInfo = await this.deviceService.findOneByKey(device_key)

      if (!deviceInfo) {
        res.status(200).json({
          ...CodeEnum.DEVICE_NOT_FOUND,
          data: errors
        });
        return;
      }

      // 清除用户令牌
      const revokedCount = await tokenGenerator.revokeAllTokensForUser(device_key);
      // 生成令牌
      const tokenInfo = await tokenGenerator.generateAccessToken(device_key);
      
      res.status(200).json({
        code: 200,
        message: '成功',
        data: {
          access_token: tokenInfo.token,
          expires_in: tokenInfo.expires_in
        }
      });

    } catch (error: any) {
      logger.error('申请令牌失败:', error.message);
      res.status(500).json({
        code: 500,
        data: null,
        message: process.env.NODE_ENV === 'production' 
        ? '服务器内部错误' 
        : `申请令牌失败: ${error.message}`
      });
    }
  }

  /**
   * 获取刷新令牌
   * @param req 
   * @param res 
   * @returns 
   */
  async getRefreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { device_key, access_token } = req.body;

      // 参数校验
      const errors: string[] = [];

      if (!device_key || typeof device_key !== 'string' || device_key.trim() === '') {
        errors.push('设备密钥(device_key)为必填项，且必须是有效的字符串');
      }

      if (!access_token || typeof access_token !== 'string' || access_token.trim() === '') {
        errors.push('访问令牌(access_token)为必填项，且必须是有效的字符串');
      }

      if (errors.length > 0) {
        res.status(200).json({
          ...CodeEnum.PARAMETER_VALIDATION_FAILED,
          data: errors
        });
        return;
      }

      let deviceInfo = await this.deviceService.findOneByWhere({
        device_key,
        is_disable: 0,
        is_delete: 0
      })

      if (!deviceInfo) {
        res.status(200).json({
          ...CodeEnum.DEVICE_NOT_FOUND,
          data: errors
        });
        return;
      }

      // 验证令牌
      const validatedToken = await tokenGenerator.validateToken(access_token);
      if (!validatedToken || validatedToken.device_key !== device_key) {
        res.status(200).json({
          ...CodeEnum.TOKEN_INVALID,
          data: null,
        });
        return;
      }

      const tokenInfo = await tokenGenerator.generateRefreshToken(device_key, deviceInfo.product_key);

      res.status(200).json({
        code: 200,
        message: '成功',
        data: {
          authorizer_refresh_token: tokenInfo.token,
          expires_in: tokenInfo.expires_in
        }
      });
      
    } catch (error: any) {
      logger.error('获取刷新令牌失败:', error.message);
      res.status(500).json({
        code: 500,
        data: null,
        message: process.env.NODE_ENV === 'production' 
        ? '服务器内部错误' 
        : `获取刷新令牌失败: ${error.message}`
      });
    }
  }

  /**
   * 刷新已有令牌
   * @param req 
   * @param res 
   * @returns 
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    // console.log('===刷新令牌===')
    try {
      const { device_key, authorizer_refresh_token } = req.body;

      // 参数校验
      const errors: string[] = [];

      if (!device_key || typeof device_key !== 'string' || device_key.trim() === '') {
        errors.push('设备密钥(device_key)为必填项，且必须是有效的字符串');
      }

      if (!authorizer_refresh_token || typeof authorizer_refresh_token !== 'string' || authorizer_refresh_token.trim() === '') {
        errors.push('访问令牌(authorizer_refresh_token)为必填项，且必须是有效的字符串');
      }

      if (errors.length > 0) {
        res.status(200).json({
          ...CodeEnum.PARAMETER_VALIDATION_FAILED,
          data: errors
        });
        return;
      }

      let deviceInfo = await this.deviceService.findOneByWhere({
        device_key,
        is_disable: 0,
        is_delete: 0
      })

      if (!deviceInfo) {
        res.status(200).json({
          ...CodeEnum.DEVICE_NOT_FOUND,
          data: errors
        });
        return;
      }

      // 验证令牌
      const validatedToken = await tokenGenerator.validateToken(authorizer_refresh_token);
      if (!validatedToken || validatedToken.device_key !== device_key) {
        res.status(200).json({
          ...CodeEnum.REFRESH_TOKEN_INVALID,
          data: null,
        });
        return;
      }

      // 使用刷新令牌获取新的访问令牌
      const newAccessToken = await tokenGenerator.refreshAccessToken(authorizer_refresh_token);

      if (newAccessToken) {
        res.status(200).json({
          code: 200,
          message: '成功',
          data: {
            access_token: newAccessToken.token,
            expires_in: newAccessToken.expires_in
          }
        });
      } else {
        res.status(200).json({
          ...CodeEnum.TOKEN_REFRESH_FAILED,
          data: null,
        });
      }
    }
    catch (error: any) {
      logger.error('刷新令牌失败:', error.message);
      res.status(500).json({
        code: 500,
        data: null,
        message: process.env.NODE_ENV === 'production' 
        ? '服务器内部错误' 
        : `刷新令牌失败: ${error.message}`
      });
    }
  }
  

  /**
   * 注册产品
   * @param req 
   * @param res 
   * @returns 
   */
  async registerProduct(req: Request, res: Response): Promise<void> {
    try {
      const { product_key, product_version, product_name, mcp_tools, mcp_name, app_key, sign } = req.body;

      // 验证参数
      const errors: string[] = [];

      if (!product_key || typeof product_key !== 'string' || product_key.trim() === '') {
        errors.push('产品密钥(product_key)为必填项，且必须是有效的字符串');
      }

      if (!product_version || typeof product_version !== 'string' || product_version.trim() === '') {
        errors.push('产品版本(product_version)为必填项，且必须是有效的字符串');
      }

      if (!product_name || typeof product_name !== 'string' || product_name.trim() === '') {
        errors.push('产品名称(product_name)为必填项，且必须是有效的字符串');
      }

      if (!mcp_tools || mcp_tools.length === 0) {
        errors.push('工具列表(mcp_tools)为必填项，且必须是有效的数组');
      }

      if (!app_key || typeof app_key !== 'string' || app_key.trim() === '') {
        errors.push('app_key为必填项，且必须是有效的字符串');
      }

      if (!sign || typeof sign !== 'string' || sign.trim() === '') {
        errors.push('sign为必填项，且必须是有效的字符串');
      }
      if (errors.length > 0) {
        res.status(200).json({
          ...CodeEnum.PARAMETER_VALIDATION_FAILED,
          data: errors
        });
        return;
      }
      
      if (!checkSign({product_key, product_version, product_name, mcp_name, app_key}, app_key, sign)) {
        res.status(200).json({
          ...CodeEnum.PARAMETER_SIGN_FAILED,
          data: errors
        });
        return;
      }

      const result = await this.productService.create(product_key, product_version, product_name, mcp_tools, mcp_name);

      if (result) {
        res.status(200).json({
          code: 200,
          message: '成功',
          data: result
        });
      }
      else {
        res.status(200).json({
          ...this.productService.getError(),
          data: null
        });
      }
    } 
    catch (error: any) {
      logger.error('注册产品失败:', error.message);
      res.status(500).json({
        code: 500,
        data: null,
        message: process.env.NODE_ENV === 'production' 
        ? '服务器内部错误' 
        : `注册产品失败: ${error.message}`
      });
    }
  }

  /**
   * 注册设备
   * @param req 
   * @param res 
   * @returns 
   */
  async registerDevice(req: Request, res: Response): Promise<void> {
    try {
      const { device_key, mac, product_key, product_version } = req.body;

      // 参数校验
      const errors: string[] = [];
      
      if (!device_key || typeof device_key !== 'string' || device_key.trim() === '') {
        errors.push('设备编号(device_key)为必填项，且必须是有效的字符串');
      }
      
      if (!mac || typeof mac !== 'string' || !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac)) {
        errors.push('MAC地址(mac)为必填项，且必须是有效的MAC地址格式');
      }
      
      if (!product_key || typeof product_key !== 'string' || product_key.trim() === '') {
        errors.push('产品编号(product_key)为必填项，且必须是有效的字符串');
      }
      
      if (product_version !== undefined && (typeof product_version !== 'string' || product_version.trim() === '')) {
        errors.push('产品版本(product_version)必须是有效的字符串');
      }

      if (errors.length > 0) {
        res.status(200).json({
          ...CodeEnum.PARAMETER_VALIDATION_FAILED,
          data: errors
        });
        return;
      }
      
      const result = await this.deviceService.create(device_key, mac, product_key, product_version);

      if (result) {

        this.deviceService.saveDeviceInfo({device_key, mac, product_key, product_version})

        if (typeof result === 'object') {
          res.status(200).json({
            code: 200,
            message: '成功',
            data: {
              device_id: result.device_id,
              device_key,
              mac,
              product_key,
              product_version,
              created_at: result.created_at,
              updated_at: result.updated_at
            }
          })
        }
        else {
          res.status(200).json({
            code: 200,
            message: '成功',
            data: {
              device_key,
              mac,
              product_key,
              product_version
            }
          });
        }
      }
      else {
        res.status(200).json({
          ...this.deviceService.getError(),
          data: null
        });
      }
    } 
    catch (error: any) {
      logger.error('设备注册失败:', error.message);
      res.status(500).json({
        code: 500,
        data: null,
        message: process.env.NODE_ENV === 'production' 
        ? '服务器内部错误' 
        : `设备注册失败: ${error.message}`
      });
    }
  }

  /**
   * 更新设备
   * @param req 
   * @param res 
   * @returns 
   */
  async updateDevice(req: Request, res: Response): Promise<void> {
    try {
      const { device_key, mac, product_key, product_version } = req.body;

      // 参数校验
      const errors: string[] = [];
      
      if (!device_key || typeof device_key !== 'string' || device_key.trim() === '') {
        errors.push('设备编号(device_key)为必填项，且必须是有效的字符串');
      }
      
      if (!mac || typeof mac !== 'string' || !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac)) {
        errors.push('MAC地址(mac)为必填项，且必须是有效的MAC地址格式');
      }
      
      if (!product_key || typeof product_key !== 'string' || product_key.trim() === '') {
        errors.push('产品编号(product_key)为必填项，且必须是有效的字符串');
      }
      
      if (product_version !== undefined && (typeof product_version !== 'string' || product_version.trim() === '')) {
        errors.push('产品版本(product_version)必须是有效的字符串');
      }

      if (errors.length > 0) {
        res.status(200).json({
          ...CodeEnum.PARAMETER_VALIDATION_FAILED,
          data: errors
        });
        return;
      }
      
      const result = await this.deviceService.update(device_key, mac, product_key, product_version);

      if (result) {
        res.status(200).json({
          code: 200,
          message: '成功',
          data: result
        });
      }
      else {
        res.status(200).json({
          ...this.deviceService.getError(),
          data: null
        });
      }
    } 
    catch (error: any) {
      logger.error('设备更新失败:', error.message);
      res.status(500).json({
        code: 500,
        data: null,
        message: process.env.NODE_ENV === 'production' 
        ? '服务器内部错误' 
        : `设备更新失败: ${error.message}`
      });
    }
  }


  /**
   * 设备授权控制
   * @param req 
   * @param res 
   * @returns 
   */
  async authorizeDevice(req: Request, res: Response): Promise<void> {
    try {
      const { authorizing_device_key, authorizing_device_token, authorized_device_key, authorized_device_token, 
        start_time, end_time, status, app_key, sign } = req.body;
      
      // 参数校验
      const errors: string[] = [];
      if (!authorizing_device_key || typeof authorizing_device_key !== 'string' || authorizing_device_key.trim() === '') {
        errors.push('授权设备编号(authorizing_device_key)为必填项，且必须是有效的字符串');
      }
      if (!authorized_device_key || typeof authorized_device_key !== 'string' || authorized_device_key.trim() === '') {
        errors.push('被授权设备编号(authorized_device_key)为必填项，且必须是有效的字符串');
      }

      if (!authorizing_device_token || typeof authorizing_device_token !== 'string' || authorizing_device_token.trim() === '') {
        errors.push('访问令牌(authorizing_device_token)为必填项，且必须是有效的字符串');
      }

      if (!authorized_device_token || typeof authorized_device_token !== 'string' || authorized_device_token.trim() === '') {
        errors.push('访问令牌(authorized_device_token)为必填项，且必须是有效的字符串');
      }
      
      if (start_time === undefined || typeof start_time !== 'number' || start_time < 0) {
        errors.push('授权开始时间戳(start_time)为必填项，且必须是数字');
      }

      if (end_time === undefined || typeof end_time !== 'number' || end_time < 0) {
        errors.push('授权开始时间戳(end_time)为必填项，且必须是数字');
      }

      if (status === undefined || typeof status !== 'number' || !([0, 1].includes(status))) {
        errors.push('授权状态(status)为必填项');
      }

      if (!app_key || typeof app_key !== 'string' || app_key.trim() === '') {
        errors.push('app_key为必填项，且必须是有效的字符串');
      }

      if (!sign || typeof sign !== 'string' || sign.trim() === '') {
        errors.push('sign为必填项，且必须是有效的字符串');
      }

      if (errors.length > 0) {
        res.status(200).json({
          ...CodeEnum.PARAMETER_VALIDATION_FAILED,
          data: errors
        });
        return;
      }

      if (!checkSign({authorizing_device_key, authorizing_device_token, authorized_device_key, authorized_device_token, start_time, end_time, status, app_key}, app_key, sign)) {
        res.status(200).json({
          ...CodeEnum.PARAMETER_SIGN_FAILED,
          data: errors
        });
        return;
      }

      // 验证令牌
      const validatedToken1 = await tokenGenerator.validateToken(authorizing_device_token);
      if (!validatedToken1 || validatedToken1.device_key !== authorizing_device_key) {
        res.status(200).json({
          ...CodeEnum.TOKEN_INVALID,
          data: null,
        });
        return;
      }

      // 验证令牌
      const validatedToken2 = await tokenGenerator.validateToken(authorized_device_token);
      if (!validatedToken2 || validatedToken2.device_key !== authorized_device_key) {
        res.status(200).json({
          ...CodeEnum.TOKEN_INVALID,
          data: null,
        });
        return;
      }
      
      const result = await this.deviceService.authorizeDevice(authorizing_device_key, authorized_device_key, start_time, end_time, status);

      if (result) {
        res.status(200).json({
          code: 200,
          message: '成功',
          data: null
        });
      }
      else {
        res.status(200).json({
          ...this.deviceService.getError(),
          data: null
        });
      }

    }
    catch (error: any) {
      logger.error('设备授权失败:', error.message);
      res.status(500).json({
        code: 500,
        data: null,
        message: process.env.NODE_ENV === 'production' 
        ? '服务器内部错误' 
        : `设备授权失败: ${error.message}`
      });
    }
  }

  /**
   * 获取多个设备的有权操作的设备列表（被授权）
   */
  async getAuthorizedDevices(req: Request, res: Response): Promise<void> {
    try {
      const { device_keys, app_key, sign } = req.body;
      
      // 参数校验
      const errors: string[] = [];
      if (!device_keys || typeof device_keys !== 'string' || device_keys.trim() === '') {
        errors.push('设备编号(device_key)为必填项，且必须是有效的字符串');
      }

      if (!app_key || typeof app_key !== 'string' || app_key.trim() === '') {
        errors.push('app_key为必填项，且必须是有效的字符串');
      }

      if (!sign || typeof sign !== 'string' || sign.trim() === '') {
        errors.push('sign为必填项，且必须是有效的字符串');
      }

      if (errors.length > 0) {
        res.status(200).json({
          ...CodeEnum.PARAMETER_VALIDATION_FAILED,
          data: errors
        });
        return;
      }

      if (!checkSign({device_keys, app_key}, app_key, sign)) {
        res.status(200).json({
          ...CodeEnum.PARAMETER_SIGN_FAILED,
          data: errors
        });
        return;
      }

      let list: any[] = [];
      for (const device_key of device_keys.split(',')) {
        const result = await this.deviceService.getAuthorizedDevices(device_key);
        list.push({
          device_key : device_key,
          auth_list: result
        });
      }
      
      if (list.length > 0) {
        res.status(200).json({
          code: 200,
          message: '成功',
          data: list
        });
      }
      else {
        res.status(200).json({
          ...this.deviceService.getError(),
          data: null
        });
      }

    }
    catch (error: any) {
      logger.error('获取设备的被授权设备列表失败:', error.message);
      res.status(500).json({
        code: 500,
        data: null,
        message: process.env.NODE_ENV === 'production' 
        ? '服务器内部错误' 
        : `获取设备的被授权设备列表失败: ${error.message}`
      });
    }
  }


  /**
   * 获取多个设备的授权设备列表
   */
  async getAuthorizingDevices(req: Request, res: Response): Promise<void> { 
    try {
      const { device_keys, app_key, sign } = req.body;
      
      // 参数校验
      const errors: string[] = [];
      if (!device_keys || typeof device_keys !== 'string' || device_keys.trim() === '') {
        errors.push('设备编号(device_key)为必填项，且必须是有效的字符串');
      }

      if (!app_key || typeof app_key !== 'string' || app_key.trim() === '') {
        errors.push('app_key为必填项，且必须是有效的字符串');
      }

      if (!sign || typeof sign !== 'string' || sign.trim() === '') {
        errors.push('sign为必填项，且必须是有效的字符串');
      }

      if (errors.length > 0) {
        res.status(200).json({
          ...CodeEnum.PARAMETER_VALIDATION_FAILED,
          data: errors
        });
        return;
      }

      if (!checkSign({device_keys, app_key}, app_key, sign)) {
        res.status(200).json({
          ...CodeEnum.PARAMETER_SIGN_FAILED,
          data: errors
        });
        return;
      }

      let list: any[] = [];
      for (const device_key of device_keys.split(',')) {
        const result = await this.deviceService.getAuthorizingDevices(device_key);
        list.push({
          device_key : device_key,
          auth_list: result
        });
      }
      
      if (list.length > 0) {
        res.status(200).json({
          code: 200,
          message: '成功',
          data: list
        });
      }
      else {
        res.status(200).json({
          ...this.deviceService.getError(),
          data: null
        });
      }

    }
    catch (error: any) {
      logger.error('获取设备的授权设备列表失败:', error.message);
      res.status(500).json({
        code: 500,
        data: null,
        message: process.env.NODE_ENV === 'production' 
        ? '服务器内部错误' 
        : `获取设备的授权设备列表失败: ${error.message}`
      });
    }
  }


  /**
   * 获取设备的AccessToken
   * @param req 
   * @param res 
   * @returns 
   */
  async getDeviceToken(req: Request, res: Response): Promise<void> {
    try {
      const { device_key, app_key, sign } = req.body;
      // 参数校验
      const errors: string[] = [];
      if (!device_key || typeof device_key !== 'string' || device_key.trim() === '') {
        errors.push('设备编号(device_key)为必填项，且必须是有效的字符串');
      }

      if (!app_key || typeof app_key !== 'string' || app_key.trim() === '') {
        errors.push('app_key为必填项，且必须是有效的字符串');
      }

      if (!sign || typeof sign !== 'string' || sign.trim() === '') {
        errors.push('sign为必填项，且必须是有效的字符串');
      }

      if (errors.length > 0) {
        res.status(200).json({
          ...CodeEnum.PARAMETER_VALIDATION_FAILED,
          data: errors
        });
        return;
      }

      if (!checkSign({device_key, app_key}, app_key, sign)) {
        res.status(200).json({
          ...CodeEnum.PARAMETER_SIGN_FAILED,
          data: errors
        });
        return;
      }

      const tokens = await tokenGenerator.getAccessTokensForUser(device_key);
      if (!tokens || tokens.length === 0) {
        res.status(200).json({
          ...CodeEnum.TOKEN_NOT_FOUND,
          data: null
        });
        return;
      }
      res.status(200).json({
        code: 200,
        message: '成功',
        data: {
          access_token: tokens[tokens.length - 1]
        }
      });
    } catch (error: any) {
      logger.error('获取设备的access token失败:', error.message);
      res.status(500).json({
        code: 500,
        data: null,
        message: process.env.NODE_ENV === 'production' 
        ? '服务器内部错误' 
        : `获取设备的access token失败: ${error.message}`
      });
    }
  }
}