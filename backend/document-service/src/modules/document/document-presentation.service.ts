import { Injectable } from '@nestjs/common';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { UserProfileSnapshotResponse } from '../user-profile-snapshot/types/user-profile-snapshot.types';

@Injectable()
export class DocumentPresentationService {
  constructor(
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
  ) {}
  async enrichDocumentItem<T extends { ownerUserId: string }>(
    item: T,
  ): Promise<T & { ownerProfile: UserProfileSnapshotResponse | null }> {
    const [enriched] =
      await this.userProfileSnapshotService.attachProfilesToDocumentItems([
        item,
      ]);
    return enriched;
  }
}
