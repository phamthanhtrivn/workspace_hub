import { Injectable, Logger } from "@nestjs/common";
import { UserProfileSnapshotService } from "../../modules/user-profile-snapshot/user-profile-snapshot.service";
import { UserContact, UserDirectory } from "./project-communication.port";

@Injectable()
export class HttpUserDirectoryAdapter implements UserDirectory {
  private readonly logger = new Logger(HttpUserDirectoryAdapter.name);

  constructor(private readonly userProfiles: UserProfileSnapshotService) {}

  async getContact(userId: string): Promise<UserContact> {
    const snapshot = await this.userProfiles.getProfileByUserId(userId);
    if (snapshot?.email && snapshot.email.trim()) {
      return {
        email: snapshot.email,
        ...(snapshot.fullName?.trim() ? { fullName: snapshot.fullName } : {}),
        ...(snapshot.avatarUrl?.trim()
          ? { avatarUrl: snapshot.avatarUrl }
          : {}),
      };
    }

    this.logger.debug(
      `No snapshot found locally for user ${userId}; using fallback identity`,
    );

    return {
      email: `${userId}@workspace.local`,
      fullName: `User ${userId.slice(0, 8)}`,
    };
  }
}
