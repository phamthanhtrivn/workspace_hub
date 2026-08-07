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

import { DocumentSortBy } from '../../common/enums/document.enum';

@Controller('api/documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  private validateUserHeaders(userId: string, userEmail: string) {
    if (!userId || !userEmail) {
      throw new BadRequestException('Thiếu x-user-id hoặc x-user-email header');
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
      message: 'Tạo thư mục thành công',
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
      message: 'Khởi tạo tải lên thành công',
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
      message: 'Tải tài liệu lên thành công',
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
      message: 'Lấy danh sách tài nguyên thành công',
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
      message: 'Lấy danh sách tài nguyên được chia sẻ thành công',
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
      message: 'Đổi tên thành công',
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
      message: 'Di chuyển tài nguyên thành công',
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
      message: 'Đã chuyển tài nguyên vào thùng rác',
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
      message: 'Khôi phục tài nguyên thành công',
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
      message: 'Đã đánh dấu sao tài nguyên',
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
      message: 'Đã bỏ đánh dấu sao tài nguyên',
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
      message: 'Xóa tài nguyên vĩnh viễn thành công',
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
      message: 'Khởi tạo link xem trước thành công',
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
      message: 'Khởi tạo link tải xuống thành công',
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
      message: 'Lấy danh sách phiên bản thành công',
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
      message: 'Tạo phiên bản mới thành công',
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
      message: 'Lấy thông tin chia sẻ thành công',
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
      message: 'Cập nhật quyền liên kết thành công',
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
      message: 'Thêm chia sẻ thành công',
      data: result,
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
      message: 'Thu hồi quyền truy cập thành công',
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
      message: 'Lấy thông tin tài liệu công khai thành công',
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
      throw new BadRequestException('Không thể tải xuống thư mục');
    }
    const url = await this.documentService.getDownloadUrl(
      userId,
      userEmail,
      id,
      versionId,
    );
    return {
      message: 'Khởi tạo link tải xuống công khai thành công',
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
      throw new BadRequestException('Không thể xem trước thư mục');
    }
    const url = await this.documentService.getPreviewUrl(
      userId,
      userEmail,
      id,
      versionId,
    );
    return {
      message: 'Khởi tạo link xem trước công khai thành công',
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
      message: 'Lấy danh sách phiên bản công khai thành công',
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
      message: 'Tạo phiên bản mới công khai thành công',
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
      message: 'Đổi tên tài liệu công khai thành công',
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
      message: 'Khởi tạo tải lên công khai thành công',
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
      message: 'Lấy danh sách con thành công',
      data: children,
    };
  }
}
