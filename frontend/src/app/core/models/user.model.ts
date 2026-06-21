export interface User {
  readonly id: string;
  readonly username: string;
  readonly email: string | null;
  readonly avatar: string | null;
  readonly signature?: string | null;
  readonly gender?: 'male' | 'female' | 'secret' | null;
  readonly isStaff: boolean;
  readonly roleName: string | null;
  readonly experience?: number;
  readonly title?: UserTitle;
  readonly isActive?: boolean;
  readonly postCount?: number;
  readonly followerCount?: number;
  readonly followingCount?: number;
  readonly isFollowing?: boolean;
  readonly permissions?: readonly string[];
}

export interface UserTitle {
  readonly name: string;
  readonly level: number;
  readonly experience: number;
  readonly currentLevelExperience: number;
  readonly nextLevelExperience: number;
  readonly progress: number;
  readonly isMaxLevel: boolean;
}
