import { HttpStatus } from '@nestjs/common';

export const DOCUMENT_ACCESS_ERRORS = {
  RESTRICTED: {
    code: 'DOCUMENT_ACCESS_RESTRICTED',
    message: 'You are not allowed to access this item',
    status: HttpStatus.FORBIDDEN,
  },
  EXPIRED: {
    code: 'DOCUMENT_LINK_EXPIRED',
    message: 'The public sharing link has expired',
    status: HttpStatus.FORBIDDEN,
  },
  NOT_FOUND: {
    code: 'DOCUMENT_NOT_FOUND',
    message: 'Document or folder not found',
    status: HttpStatus.NOT_FOUND,
  },
  UNAVAILABLE: {
    code: 'DOCUMENT_UNAVAILABLE',
    message: 'Document unavailable',
    status: HttpStatus.FORBIDDEN,
  },
} as const;
