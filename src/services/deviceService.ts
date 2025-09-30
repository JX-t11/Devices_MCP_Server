import { In, Repository, FindOptionsWhere, MoreThan } from 'typeorm';
import { Device } from '../entities/Device';
import { Product } from '../entities/Product';
import { DeviceAuthorization } from '@/entities/DeviceAuthorization';
import AppDataSource from '../data-source';
import { logger } from '@/utils/logger';
import { ApiResponse } from '@/types/index';
import { CodeEnum } from '@/utils/codeEnum';
import { redisService } from '@/services/redisService';
import { DeviceInfo } from '@/types/index';

export class DeviceService {
  private deviceRepository: Repository<Device>;
  private productRepository: Repository<Product>;
  private deviceAuthorizationRepository: Repository<DeviceAuthorization>;
  private error: ApiResponse;

  constructor() {
    this.deviceRepository = AppDataSource.getRepository(Device);
    this.productRepository = AppDataSource.getRepository(Product);
    this.deviceAuthorizationRepository = AppDataSource.getRepository(DeviceAuthorization);
    this.error = {
      code: 200,
      message: ''
    };
  }

  getError() {
    return this.error;
  }

  /**
   * 创建新设备
   * @returns 创建的设备
   */
  async create(device_key: string, mac: string, product_key: string, product_version: string): Promise<Device | boolean> {
    // 验证产品是否已存在
    const existingProduct = await this.productRepository.findOne({
      where: { product_key, product_version: product_version, is_delete: 0 }
    });

    if (!existingProduct) {
      this.error = CodeEnum.PRODUCT_NOT_FOUND;
      return false
    }

    const existingDevice = await this.deviceRepository.findOne({
      where: { device_key }
    });

    // 设置时间戳
    const now = Math.floor(Date.now() / 1000); // 秒级时间戳

    if (existingDevice) {
      // 设备存在，更新信息
      existingDevice.mac = mac;
      existingDevice.product_key = product_key;
      existingDevice.product_version = product_version;
      existingDevice.update_time = now;
      return this.deviceRepository.save(existingDevice);
    } else {
      // 设备不存在，创建新设备
      const newDevice = this.deviceRepository.create({
          device_key,
          mac,
          product_key,
          product_version,
          name : existingProduct.mcp_name,
          create_time: now,
          update_time: now
      });
      return this.deviceRepository.save(newDevice);
    }
  }

  /**
   * 根据ID查询设备
   * @param device_id 设备ID
   * @returns 设备信息或null
   */
  async findOneById(device_id: number): Promise<Device | null> {
    return this.deviceRepository.findOne({
      where: { device_id, is_delete: 0 }
    });
  }

  /**
   * 根据设备密钥查询设备
   * @param device_key 设备密钥
   * @returns 设备信息或null
   */
  async findOneByKey(device_key: string): Promise<Device | null> {
    return this.deviceRepository.findOne({
      where: { device_key, is_delete: 0 }
    });
  }

  /**
   * 根据条件查询设备
   * @returns 设备信息或null
   */
  async findOneByWhere(where: FindOptionsWhere<Device> | FindOptionsWhere<Device>[]): Promise<Device | null> {
    // 基本参数校验
    if (!where || (Array.isArray(where) && where.length === 0) || (!Array.isArray(where) && Object.keys(where).length === 0)) {
      throw new Error('查询条件不能为空');
    }
    return this.deviceRepository.findOne({
      where
    });
  }

  /**
   * 更新设备信息
   * @param device_key 
   * @param where 
   * @returns 
   */
  async update(device_key: string, mac: string, product_key: string, product_version: string): Promise<boolean> {
    // 验证设备是否存在
    const existingDevice = await this.deviceRepository.findOne({
      where: { device_key, is_delete: 0 }
    });
    if (!existingDevice) {
      this.error = CodeEnum.DEVICE_NOT_FOUND
      return false
    }

    // 验证产品是否已存在
    const existingProduct = await this.productRepository.findOne({
      where: { product_key, product_version: product_version, is_delete: 0 }
    });

    if (!existingProduct) {
      this.error = CodeEnum.PRODUCT_NOT_FOUND
      return false
    }

    const result = await this.deviceRepository.update(
      { device_key: device_key },
      {
        mac,
        product_key,
        product_version,
        update_time: Math.floor(Date.now() / 1000)
      }
    );
    
    return (result.affected ?? 0) > 0;
  }

  /**
   * 更新设备名称
   * @param device_key 
   * @param name 
   * @returns 
   */
  async updateName(device_key: string, name: string): Promise<boolean> {
    // 验证设备是否存在
    const existingDevice = await this.deviceRepository.findOne({
      where: { device_key, is_delete: 0 }
    });
    if (!existingDevice) {
      this.error = CodeEnum.DEVICE_NOT_FOUND
      return false
    }

    const result = await this.deviceRepository.update(
      { device_key: device_key },
      {
        name,
        update_time: Math.floor(Date.now() / 1000)
      }
    );
    
    return (result.affected ?? 0) > 0;
  }

  /**
   * 批量删除设备
   * @param deviceIds 设备ID数组
   * @returns 操作结果
   */
  async batchSoftDelete(deviceIds: number[]): Promise<boolean> {
    const result = await this.deviceRepository.update(
      { device_id: In(deviceIds) },
      { is_delete: 1 }
    );
    
    if (result.affected === undefined) {
      return false;
    }
    return result.affected > 0;
  }

  /**
   * 保存设备信息到redis
   */
  async saveDeviceInfo(deviceInfo: DeviceInfo): Promise<void> {
    const key = `device:info:${deviceInfo.device_key}`
    
    // 保存设备信息
    const saveSuccess = await redisService.set(
      key, 
      deviceInfo
    );
    
    if (!saveSuccess) {
      throw new Error('Failed to save token to Redis');
    }
  }

  /**
   * 设备间授权
   */
  async authorizeDevice(authorizing_device_key: string, authorized_device_key: string, start_time: number, end_time: number, status: number): Promise<DeviceAuthorization | Boolean> {
    
    const existingRecord = await this.deviceAuthorizationRepository.findOne({
      where: {
        authorizing_device_key: authorizing_device_key,
        authorized_device_key: authorized_device_key 
      }
    });

    // 设置时间戳
    const now = Math.floor(Date.now() / 1000); // 秒级时间戳

    if (existingRecord) {
      // 存在，更新信息
      existingRecord.status = status;
      existingRecord.start_time = start_time;
      existingRecord.end_time = end_time;
      existingRecord.update_time = now;
      return this.deviceAuthorizationRepository.save(existingRecord);
    } else {
      // 不存在，则创建
      const newRecord = this.deviceAuthorizationRepository.create({
          authorizing_device_key,
          authorized_device_key,
          authorization_type: 1,
          start_time,
          end_time,
          status,
          remarks: '',
          create_time: now,
          update_time: now
      });
      return this.deviceAuthorizationRepository.save(newRecord);
    }
  }

  /**
   * 设备解除授权
   */
  async unauthorizeDevice(authorizing_device_key: string, authorized_device_key: string): Promise<DeviceAuthorization | Boolean> {
    
    const existingRecord = await this.deviceAuthorizationRepository.findOne({
      where: {
        authorizing_device_key: authorizing_device_key,
        authorized_device_key: authorized_device_key 
      }
    });

    // 设置时间戳
    const now = Math.floor(Date.now() / 1000); // 秒级时间戳

    if (existingRecord) {
      // 存在，更新信息
      existingRecord.status = 0;
      existingRecord.update_time = now;
      return this.deviceAuthorizationRepository.save(existingRecord);
    } else {
      // 不存在
      this.error = CodeEnum.DEVICE_UNAUTHORIZATION_FAILED
      return false
    }
  }

  /**
   * 获取指定设备的有权操作的设备列表
   */
  async getAuthorizedDevices(device_key: string): Promise<DeviceAuthorization[]> {
    const now = Math.floor(Date.now() / 1000);
    const deviceAuthorizationRecords = await this.deviceAuthorizationRepository.find({
      where: [
        {
          authorized_device_key: device_key,
          status: 1,
          end_time: 0
        },
        {
          authorized_device_key: device_key,
          status: 1,
          end_time: MoreThan(now),
        },
      ],
      select: ['authorizing_device_key', 'status', 'start_time', 'end_time', 'remarks']
    });

    return deviceAuthorizationRecords;
  }


  /**
   * 获取指定设备的授权设备列表
   */
  async getAuthorizingDevices(device_key: string): Promise<DeviceAuthorization[]> {
    const now = Math.floor(Date.now() / 1000);
    const deviceAuthorizationRecords = await this.deviceAuthorizationRepository.find({
      where: [
        {
          authorizing_device_key: device_key,
          status: 1,
          end_time: 0
        },
        {
          authorizing_device_key: device_key,
          status: 1,
          end_time: MoreThan(now),
        },
      ],
      select: ['authorized_device_key', 'status', 'start_time', 'end_time', 'remarks']
    });

    return deviceAuthorizationRecords;
  }
}
