export type UserProfile = {
  id: string;
  role: 'retailer' | 'reseller' | string;
  [key: string]: any;
};
export * from './authenticated-user.type';
