// common/interfaces/request-user.interface.ts
// 挂载在 @CurrentUser() 装饰器上的用户上下文类型

export interface IRequestUser {
  userId: string;
  username: string;
  apiKey: string;
  deviceId?: string; // 如果用户只绑定一台设备，可直接暴露
}
