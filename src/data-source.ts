import { DataSource } from "typeorm";
import { mysqlConfig } from '@/config';

const AppDataSource = new DataSource({
    type: "mysql",
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    username: mysqlConfig.username,
    password: mysqlConfig.password,
    database: mysqlConfig.database,
    synchronize: false,          // 开发环境下自动同步实体到数据库
    logging: false,              // 是否打印 SQL 日志
    entities: ["src/entities/**/*.ts"]  // 实体文件路径
});

export default AppDataSource