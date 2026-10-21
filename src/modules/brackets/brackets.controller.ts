import { Request, Response, NextFunction } from 'express';
import { bracketsService } from './brackets.service.js';
import { ApiResponse } from '../../utils/api-response.js';

export class BracketsController {
  public async generateBracket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await bracketsService.generateBracket(req.body.tournamentId);
      ApiResponse.created(res, result, 'Tournament bracket generated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getBracket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await bracketsService.getBracket(req.params.tournamentId);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const bracketsController = new BracketsController();
