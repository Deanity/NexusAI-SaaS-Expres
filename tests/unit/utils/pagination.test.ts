import { parsePagination, getPaginationMeta } from '@/shared/utils/pagination';
import { Request } from 'express';

describe('Pagination Utility Unit Tests', () => {
  describe('parsePagination', () => {
    it('should parse standard pagination queries', () => {
      const mockReq = {
        query: { page: '2', limit: '10' },
      } as unknown as Request;

      const result = parsePagination(mockReq);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.skip).toBe(10);
    });

    it('should fallback to defaults when query is missing', () => {
      const mockReq = {
        query: {},
      } as unknown as Request;

      const result = parsePagination(mockReq);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.skip).toBe(0);
    });

    it('should clamp negative or invalid page/limit numbers to minimums', () => {
      const mockReq = {
        query: { page: '-5', limit: '0' },
      } as unknown as Request;

      const result = parsePagination(mockReq);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20); // fallback default
    });

    it('should clamp limit to max limit boundary', () => {
      const mockReq = {
        query: { page: '1', limit: '500' },
      } as unknown as Request;

      const result = parsePagination(mockReq, 20, 100);
      expect(result.limit).toBe(100);
    });
  });

  describe('getPaginationMeta', () => {
    it('should correctly calculate total pages and metadata', () => {
      const meta = getPaginationMeta(2, 10, 45);
      expect(meta.page).toBe(2);
      expect(meta.limit).toBe(10);
      expect(meta.total).toBe(45);
      expect(meta.totalPages).toBe(5);
    });

    it('should handle zero total items correctly', () => {
      const meta = getPaginationMeta(1, 20, 0);
      expect(meta.totalPages).toBe(0);
    });
  });
});
