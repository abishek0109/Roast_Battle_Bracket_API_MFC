import { Request, Response, NextFunction } from 'express';
import { tournamentsService } from './tournaments.service.js';
import { ApiResponse } from '../../utils/api-response.js';

export class TournamentsController {
  public async createTournament(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await tournamentsService.createTournament(req.body);
      ApiResponse.created(res, result, 'Tournament created successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getTournaments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await tournamentsService.getTournaments(req.query as any);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  public async getTournamentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await tournamentsService.getTournamentById(req.params.id);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  public async updateTournament(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await tournamentsService.updateTournament(req.params.id, req.body);
      ApiResponse.success(res, result, 'Tournament updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async enrollContestant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await tournamentsService.enrollContestant(req.params.id, req.body);
      ApiResponse.created(res, result, 'Contestant enrolled in tournament successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getTournamentWinner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await tournamentsService.getTournamentWinner(req.params.id);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const tournamentsController = new TournamentsController();
