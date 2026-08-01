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
} from '@nestjs/common';
import { DocumentService } from './document.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RenameItemDto } from './dto/rename-item.dto';
import { MoveItemDto } from './dto/move-item.dto';
import { InitiateUploadDto } from './dto/initiate-upload.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';

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
  ) {
    this.validateUserHeaders(userId, userEmail);
    const url = await this.documentService.getPreviewUrl(userId, userEmail, id);
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
  ) {
    this.validateUserHeaders(userId, userEmail);
    const url = await this.documentService.getDownloadUrl(userId, userEmail, id);
    return {
      message: 'Khởi tạo link tải xuống thành công',
      data: { url },
    };
  }
}
