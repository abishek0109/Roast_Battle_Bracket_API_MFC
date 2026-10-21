import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { registerSchema, loginSchema } from './auth.schema.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authRateLimiter } from '../../middleware/rate-limit.middleware.js';

const router = Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);
router.get('/me', authenticate, authController.getMe);

export default router;
