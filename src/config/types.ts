export interface IAppConfig {
  port: number;
}
export interface IDbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface IJwtConfig {
  secret: string;
  accessSecret: string;
  refreshSecret: string;
}

export interface IConfig {
  app: IAppConfig;
  db: IDbConfig;
  jwt: IJwtConfig;
}
