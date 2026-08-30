import 'reflect-metadata';
import { paginate, PaginationQueryDto } from './pagination';

describe('paginate', () => {
  it('returns stable metadata while preserving an array payload', () => {
    const query = Object.assign(new PaginationQueryDto(), { page: 2, limit: 2 });

    expect(paginate(['c', 'd'], 5, query)).toEqual({
      items: ['c', 'd'],
      pagination: {
        page: 2,
        limit: 2,
        total: 5,
        totalPages: 3,
        hasNext: true,
      },
    });
  });
});
