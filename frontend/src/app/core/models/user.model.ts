export interface User {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly avatar: string | null;
  readonly isStaff: boolean;
  readonly roleName: string | null;
}
