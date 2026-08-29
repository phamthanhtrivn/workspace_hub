import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  BadRequestException,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { DocumentService } from './document.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RenameItemDto } from './dto/rename-item.dto';
import { MoveItemDto } from './dto/move-item.dto';
import { InitiateUploadDto } from './dto/initiate-upload.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { CreateVersionDto } from './dto/create-version.dto';
import { UpdateLinkAccessDto } from './dto/update-link-access.dto';
import { AddShareDto } from './dto/add-share.dto';
import { CheckPermissionsDto } from './dto/check-permissions.dto';
import { AddShareBatchDto } from './dto/add-share-batch.dto';

import { DocumentSortBy } from '../../common/enums/document.enum';

@Controller('api/documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  private validateUserHeaders(userId: string, userEmail: string) {
    if (!userId || !userEmail) {
      throw new BadRequestException('Missing x-user-id or x-user-email header');
    }
  }

  @Post('folders')
  async createFolder(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Body() dto: CreateFolderDto,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const folder = await this.documentService.createFolder(
      userId,
      userEmail,
      dto,
    );
    return {
      message: 'Folder created successfully',
      data: folder,
    };
  }

  @Post('upload/initiate')
  async initiateUpload(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Body() dto: InitiateUploadDto,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const result = await this.documentService.initiateUpload(
      userId,
      userEmail,
      dto,
    );
    return {
      message: 'Upload initialized successfully',
      data: result,
    };
  }

  @Post('upload/confirm')
  async confirmUpload(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Body() dto: ConfirmUploadDto,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const item = await this.documentService.confirmUpload(
      userId,
      userEmail,
      dto,
    );
    return {
      message: 'Document uploaded successfully',
      data: item,
    };
  }

  @Get()
  async getItems(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Query('folderId') folderId?: string,
    @Query('starred') starred?: string,
    @Query('archived') archived?: string,
    @Query('projectId') projectId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: DocumentSortBy,
    @Query('search') search?: string,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const isStarredOnly = starred === 'true';
    const isArchived = archived === 'true';
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 8;

    const result = await this.documentService.getItems(userId, userEmail, {
      folderId,
      isStarredOnly,
      isArchived,
      projectId,
      page: pageNum,
      limit: limitNum,
      sortBy,
      search,
    });

    const totalPages = Math.ceil(result.totalCount / limitNum);

    return {
      message: 'Items retrieved successfully',
      data: result.items,
      meta: {
        totalItems: result.totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
    };
  }

  @Get('shared')
  async getSharedWithMe(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: DocumentSortBy,
    @Query('search') search?: string,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 8;

    const result = await this.documentService.getItems(userId, userEmail, {
      isSharedOnly: true,
      page: pageNum,
      limit: limitNum,
      sortBy,
      search,
    });

    const totalPages = Math.ceil(result.totalCount / limitNum);

    return {
      message: 'Shared items retrieved successfully',
      data: result.items,
      meta: {
        totalItems: result.totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
    };
  }

  @Put(':id/rename')
  async renameItem(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Param('id') id: string,
    @Body() dto: RenameItemDto,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const item = await this.documentService.renameItem(
      userId,
      userEmail,
      id,
      dto,
    );
    return {
      message: 'Renamed successfully',
      data: item,
    };
  }

  @Put(':id/move')
  async moveItem(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Param('id') id: string,
    @Body() dto: MoveItemDto,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const item = await this.documentService.moveItem(
      userId,
      userEmail,
      id,
      dto,
    );
    return {
      message: 'Item moved successfully',
      data: item,
    };
  }

  @Delete(':id')
  async archiveItem(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Param('id') id: string,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const item = await this.documentService.archiveItem(
      userId,
      userEmail,
      id,
      true,
    );
    return {
      message: 'Item moved to trash',
      data: item,
    };
  }

  @Put(':id/restore')
  async restoreItem(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Param('id') id: string,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const item = await this.documentService.archiveItem(
      userId,
      userEmail,
      id,
      false,
    );
    return {
      message: 'Item restored successfully',
      data: item,
    };
  }

  @Put(':id/star')
  async starItem(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Param('id') id: string,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const item = await this.documentService.toggleStar(
      userId,
      userEmail,
      id,
      true,
    );
    return {
      message: 'Item starred successfully',
      data: item,
    };
  }

  @Put(':id/un-star')
  async unStarItem(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Param('id') id: string,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const item = await this.documentService.toggleStar(
      userId,
      userEmail,
      id,
      false,
    );
    return {
      message: 'Item unstarred successfully',
      data: item,
    };
  }

  @Delete(':id/permanent')
  async deleteItemPermanently(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Param('id') id: string,
  ) {
    this.validateUserHeaders(userId, userEmail);
    await this.documentService.deleteItemPermanently(userId, userEmail, id);
    return {
      message: 'Item permanently deleted successfully',
    };
  }

  @Get(':id/access')
  async getAccessibleItem(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const item = await this.documentService.checkPermission(
      id,
      userId,
      userEmail,
    );
    return {
      message: 'Document access verified',
      data: { id: item.id, name: item.name, type: item.type },
    };
  }

  @Get(':id/preview')
  async getPreviewUrl(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Param('id') id: string,
    @Query('versionId') versionId?: string,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const url = await this.documentService.getPreviewUrl(
      userId,
      userEmail,
      id,
      versionId,
    );
    return {
      message: 'Preview link initialized successfully',
      data: { url },
    };
  }

  @Get(':id/download-url')
  async getDownloadUrl(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Param('id') id: string,
    @Query('versionId') versionId?: string,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const url = await this.documentService.getDownloadUrl(
      userId,
      userEmail,
      id,
      versionId,
    );
    return {
      message: 'Download link initialized successfully',
      data: { url },
    };
  }

  @Get(':id/download-folder')
  async downloadFolder(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    this.validateUserHeaders(userId, userEmail);
    await this.documentService.downloadFolderAsZip(userId, userEmail, id, res);
  }

  @Get(':id/versions')
  async getVersions(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Param('id') id: string,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const versions = await this.documentService.getVersions(
      userId,
      userEmail,
      id,
    );
    return {
      message: 'Versions retrieved successfully',
      data: versions,
    };
  }

  @Post(':id/versions')
  async createVersion(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Param('id') id: string,
    @Body() dto: CreateVersionDto,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const version = await this.documentService.createVersion(
      userId,
      userEmail,
      id,
      dto,
    );
    return {
      message: 'New version created successfully',
      data: version,
    };
  }

  @Get(':id/sharing')
  async getSharing(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Param('id') id: string,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const result = await this.documentService.getSharing(userId, userEmail, id);
    return {
      message: 'Share information retrieved successfully',
      data: result,
    };
  }

  @Put(':id/sharing/link-access')
  async updateLinkAccess(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Param('id') id: string,
    @Body() dto: UpdateLinkAccessDto,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const result = await this.documentService.updateLinkAccess(
      userId,
      userEmail,
      id,
      dto.linkAccess,
    );
    return {
      message: 'Link access updated successfully',
      data: result,
    };
  }

  @Post(':id/sharing/shares')
  async addShare(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Param('id') id: string,
    @Body() dto: AddShareDto,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const result = await this.documentService.addShare(
      userId,
      userEmail,
      id,
      dto.email,
      dto.permission,
    );
    return {
      message: 'Share added successfully',
      data: result,
    };
  }

  @Get(':id/chat-metadata')
  async getChatMetadata(
    @Param('id') id: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-email') userEmail?: string,
  ) {
    const result = await this.documentService.getChatMetadata(
      id,
      userId,
      userEmail,
    );
    return {
      message: 'Chat metadata retrieved successfully',
      data: result,
    };
  }

  @Post(':id/sharing/check-permissions')
  async checkPermissions(
    @Param('id') id: string,
    @Body() dto: CheckPermissionsDto,
  ) {
    const result = await this.documentService.checkEmailsPermissions(
      id,
      dto.emails,
    );
    return {
      message: 'Permissions checked successfully',
      data: result,
    };
  }

  @Post(':id/sharing/shares/batch')
  async addSharesBatch(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Param('id') id: string,
    @Body() dto: AddShareBatchDto,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const result = await this.documentService.addSharesBatch(
      userId,
      userEmail,
      id,
      dto.emails,
      dto.permission,
    );
    return {
      message: 'Batch shares added successfully',
      data: result,
    };
  }

  @Get(':id/breadcrumbs')
  async getBreadcrumbs(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Param('id') id: string,
  ) {
    this.validateUserHeaders(userId, userEmail);
    const breadcrumbs = await this.documentService.getFolderAncestors(
      userId,
      userEmail,
      id,
    );
    return {
      message: 'Breadcrumbs retrieved successfully',
      data: breadcrumbs,
    };
  }

  @Delete(':id/sharing/shares/:shareId')
  async removeShare(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Param('id') id: string,
    @Param('shareId') shareId: string,
  ) {
    this.validateUserHeaders(userId, userEmail);
    await this.documentService.removeShare(userId, userEmail, id, shareId);
    return {
      message: 'Access revoked successfully',
    };
  }

  @Get('public/:id')
  async getPublicDocument(
    @Param('id') id: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-email') userEmail?: string,
  ) {
    const result = await this.documentService.getPublicDocument(
      id,
      userId,
      userEmail,
    );
    return {
      message: 'Public document information retrieved successfully',
      data: result,
    };
  }

  @Get('public/:id/download-url')
  async getPublicDownloadUrl(
    @Param('id') id: string,
    @Query('versionId') versionId?: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-email') userEmail?: string,
  ) {
    const item = await this.documentService.checkPermission(
      id,
      userId,
      userEmail,
    );
    if (item.type === 'FOLDER') {
      throw new BadRequestException('Folders cannot be downloaded directly');
    }
    const url = await this.documentService.getDownloadUrl(
      userId,
      userEmail,
      id,
      versionId,
    );
    return {
      message: 'Public download link initialized successfully',
      data: { url },
    };
  }

  @Get('public/:id/preview-url')
  async getPublicPreviewUrl(
    @Param('id') id: string,
    @Query('versionId') versionId?: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-email') userEmail?: string,
  ) {
    const item = await this.documentService.checkPermission(
      id,
      userId,
      userEmail,
    );
    if (item.type === 'FOLDER') {
      throw new BadRequestException('Folders cannot be previewed');
    }
    const url = await this.documentService.getPreviewUrl(
      userId,
      userEmail,
      id,
      versionId,
    );
    return {
      message: 'Public preview link initialized successfully',
      data: { url },
    };
  }

  @Get('public/:id/versions')
  async getPublicVersions(
    @Param('id') id: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-email') userEmail?: string,
  ) {
    const versions = await this.documentService.getPublicVersions(
      id,
      userId,
      userEmail,
    );
    return {
      message: 'Public versions retrieved successfully',
      data: versions,
    };
  }

  @Post('public/:id/versions')
  async createPublicVersion(
    @Param('id') id: string,
    @Body() dto: CreateVersionDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-email') userEmail?: string,
  ) {
    const version = await this.documentService.createPublicVersion(
      id,
      dto,
      userId,
      userEmail,
    );
    return {
      message: 'New public version created successfully',
      data: version,
    };
  }

  @Put('public/:id/rename')
  async renamePublicItem(
    @Param('id') id: string,
    @Body() dto: RenameItemDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-email') userEmail?: string,
  ) {
    const result = await this.documentService.renamePublicItem(
      id,
      dto,
      userId,
      userEmail,
    );
    return {
      message: 'Public document renamed successfully',
      data: result,
    };
  }

  @Post('public/:id/upload/initiate')
  async initiatePublicUpload(
    @Param('id') id: string,
    @Body() dto: InitiateUploadDto,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-email') userEmail?: string,
  ) {
    const result = await this.documentService.initiatePublicUpload(
      id,
      dto,
      userId,
      userEmail,
    );
    return {
      message: 'Public upload initialized successfully',
      data: result,
    };
  }

  @Get('public/:id/download-folder')
  async downloadPublicFolder(
    @Param('id') id: string,
    @Res() res: Response,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-email') userEmail?: string,
  ) {
    await this.documentService.downloadFolderAsZip(userId, userEmail, id, res);
  }

  @Get('public/:id/children')
  async getPublicFolderChildren(
    @Param('id') id: string,
    @Query('folderId') folderId?: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-email') userEmail?: string,
  ) {
    const targetFolderId = folderId || id;
    const children = await this.documentService.getPublicFolderChildren(
      id,
      targetFolderId,
      userId,
      userEmail,
    );
    return {
      message: 'Children retrieved successfully',
      data: children,
    };
  }
}
