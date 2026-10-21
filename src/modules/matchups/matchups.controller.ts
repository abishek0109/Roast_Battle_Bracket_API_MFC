import { Request, Response, NextFunction } from 'express';
import { matchupsService } from './matchups.service.js';
import { ApiResponse } from '../../utils/api-response.js';

export class MatchupsController {
  public async submitRoastLine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await matchupsService.submitRoastLine(req.params.matchupId, req.body, req.user!);
      ApiResponse.created(res, result, 'Roast line submitted successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getRoastLines(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await matchupsService.getRoastLines(req.params.matchupId);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  public async updateRoastLine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await matchupsService.updateRoastLine(req.params.id, req.body, req.user!);
      ApiResponse.success(res, result, 'Roast line updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async deleteRoastLine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await matchupsService.deleteRoastLine(req.params.id, req.user!);
      ApiResponse.success(res, result, 'Roast line deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getMatchupStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await matchupsService.getMatchupStatus(req.params.id);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  public async getMatchupResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await matchupsService.getMatchupResults(req.params.id);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  public async initiateTiebreak(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await matchupsService.initiateTiebreak(req.params.id, req.body, req.user!);
      ApiResponse.created(res, result, 'Tiebreak session initiated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const matchupsController = new MatchupsController();
