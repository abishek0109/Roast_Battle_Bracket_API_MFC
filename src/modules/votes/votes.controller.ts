import { Request, Response, NextFunction } from 'express';
import { votesService } from './votes.service.js';
import { ApiResponse } from '../../utils/api-response.js';

export class VotesController {
  public async submitVote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await votesService.submitVote(req.params.matchupId, req.body, req.user!);
      ApiResponse.created(res, result, 'Vote successfully recorded');
    } catch (error) {
      next(error);
    }
  }
}

export const votesController = new VotesController();
