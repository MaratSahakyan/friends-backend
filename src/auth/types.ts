export interface IUserLogin {
  email: string;
  password: string;
}

export type IPayload = {
  userId: number;
  email: string;
  iat: number;
  exp: number;
};
