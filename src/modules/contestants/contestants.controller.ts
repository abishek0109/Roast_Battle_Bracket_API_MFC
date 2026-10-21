import { Request, Response, NextFunction } from 'express';
import { contestantsService } from './contestants.service.js';
import { ApiResponse } from '../../utils/api-response.js';

export class ContestantsController {
  public async createContestant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await contestantsService.createContestant(
        req.body,
        req.user?.userId,
        req.user?.role
      );
      ApiResponse.created(res, result, 'Contestant registered successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getContestants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await contestantsService.getContestants(req.query as any);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  public async getContestantById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await contestantsService.getContestantById(req.params.id);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  public async updateContestant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await contestantsService.updateContestant(
        req.params.id,
        req.body,
        req.user?.userId,
        req.user?.role
      );
      ApiResponse.success(res, result, 'Contestant updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async deleteContestant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await contestantsService.deleteContestant(
        req.params.id,
        req.user?.userId,
        req.user?.role
      );
      ApiResponse.success(res, result, 'Contestant deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getContestantHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await contestantsService.getContestantHistory(req.params.id);
      ApiResponse.success(res, result, 'Contestant history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const contestantsController = new ContestantsController();
