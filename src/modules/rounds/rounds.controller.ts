import { Request, Response, NextFunction } from 'express';
import { roundsService } from './rounds.service.js';
import { ApiResponse } from '../../utils/api-response.js';

export class RoundsController {
  public async advanceRound(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await roundsService.advanceRound(req.body);
      ApiResponse.success(res, result, 'Round advancement processed');
    } catch (error) {
      next(error);
    }
  }
}

export const roundsController = new RoundsController();
