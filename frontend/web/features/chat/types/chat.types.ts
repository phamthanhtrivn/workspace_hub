export interface UserSearchResponse {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface UserProfileResponse {
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  phoneNumber: string | null;
  dob: string | null;
  bio: string | null;
}
