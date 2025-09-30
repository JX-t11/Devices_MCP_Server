import { Repository } from 'typeorm';
import { Product } from '../entities/Product';
import AppDataSource from '../data-source';
import { CommonMcpToolParams } from "../types";
import { ApiResponse } from '@/types/index';
import { CodeEnum } from '@/utils/codeEnum';

export class ProductService {
  private productRepository: Repository<Product>;
  private error: ApiResponse;

  constructor() {
    this.productRepository = AppDataSource.getRepository(Product);
    this.error = {
      code: 200,
      message: ''
    };
  }

  getError() {
    return this.error;
  }

  /**
   * 创建新产品
   * @returns 创建的产品
   */
  async create(product_key: string, product_version: string, product_name: string, toolsArr: Array<CommonMcpToolParams>, mcp_name: string): Promise<Product | boolean> {
    // 验证产品是否已存在
    const existingProduct = await this.productRepository.findOne({
      where: { product_key, product_version }
    });

    if (existingProduct) {
      this.error = CodeEnum.PRODUCT_DUPLICATE
      return false;
    }

    // 设置时间戳
    const now = Math.floor(Date.now() / 1000); // 秒级时间戳
    const product = this.productRepository.create({
      product_key,
      product_name,
      product_version,
      mcp_name,
      mcp_tools: JSON.stringify(toolsArr),
      create_time: now,
      update_time: now
    });

    return this.productRepository.save(product);
  }

  /**
   * 根据ID获取产品
   * @param id 产品ID
   * @returns 产品信息
   */
  async findOne(id: number): Promise<Product | boolean> {
    const product = await this.productRepository.findOne({
      where: { product_id: id, is_delete: 0 }
    });

    if (!product) {
      this.error = CodeEnum.PRODUCT_NOT_FOUND;
      return false;
    }

    return product;
  }

  /**
   * 根据产品编号和版本获取产品
   * @param product_key 产品唯一编号
   * @param version 产品版本
   * @returns 产品信息
   */
  async findByKey(product_key: string, product_version: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { product_key, product_version, is_delete: 0 }
    });

    if (!product) {
      throw new Error(`产品 ${product_key} ${product_version} 不存在或已删除`);
    }

    return product;
  }

  /**
   * 获取产品列表
   * @param page 页码
   * @param limit 每页数量
   * @returns 产品列表及总数
   */
  async findAll(page: number = 1, limit: number = 10): Promise<{
    list: Product[],
    total: number,
    page: number,
    limit: number
  }> {
    const skip = (page - 1) * limit;
    
    const [list, total] = await this.productRepository.findAndCount({
      where: { is_delete: 0 },
      order: { create_time: 'DESC' },
      skip,
      take: limit
    });

    return {
      list,
      total,
      page,
      limit
    };
  }

  /**
   * 更新产品信息
   * @param id 产品ID
   * @param updateData 要更新的字段
   * @returns 更新后的产品
   */
  async update(id: number, updateData: Partial<Product>): Promise<Product | boolean> {
    // 检查产品是否存在
    const product = await this.findOne(id);
    if (product && typeof product === 'object') {
      // 如果更新了产品编号和版本号，需要验证唯一性
      if (updateData.product_key && updateData.product_key !== product.product_key && updateData.product_version !== product.product_version) {
        const existing = await this.productRepository.findOne({
          where: { product_key: updateData.product_key }
        });
        
        if (existing) {
          this.error = CodeEnum.PRODUCT_DUPLICATE
          return false
        }
      }

      // 更新时间戳
      const now = Math.floor(Date.now() / 1000);
      Object.assign(product, updateData, { update_time: now });

      return this.productRepository.save(product);
    } else {
      return false
    }
  }

  /**
   * 软删除产品（标记为已删除）
   * @param id 产品ID
   */
  async softDelete(id: number): Promise<boolean> {
    const product = await this.findOne(id);
    
    if (product && typeof product === 'object') {
      product.is_delete = 1;
      product.update_time = Math.floor(Date.now() / 1000);
      
      await this.productRepository.save(product);
      return true
    } else {
      return false
    }
    
  }

  /**
   * 批量删除产品
   * @param ids 产品ID数组
   */
  async batchDelete(ids: number[]): Promise<void> {
    if (!ids || ids.length === 0) {
      throw new Error("请提供要删除的产品ID");
    }

    const now = Math.floor(Date.now() / 1000);
    await this.productRepository.update(ids, {
      is_delete: 1,
      update_time: now
    });
  }

  /**
   * 检查产品是否存在
   * @param id 产品ID
   * @returns 是否存在
   */
  async exists(id: number): Promise<boolean> {
    const count = await this.productRepository.count({
      where: { product_id: id, is_delete: 0 }
    });
    return count > 0;
  }
}