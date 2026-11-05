import { Router } from 'express';
import { validateBody } from '../../middleware/validate';
import { csrfProtection, requireAuth } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  changePasswordSchema,
  updateProfileSchema,
  refreshSchema,
} from '@commerce/validation';
import * as ctrl from './auth.controller';

export const authRouter = Router();

authRouter.post('/register', authLimiter, validateBody(registerSchema), ctrl.register);
authRouter.post('/login', authLimiter, validateBody(loginSchema), ctrl.login);
authRouter.post('/logout', csrfProtection, ctrl.logout);
authRouter.post('/refresh', validateBody(refreshSchema), ctrl.refresh);
authRouter.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), ctrl.forgotPassword);
authRouter.post('/reset-password', authLimiter, validateBody(resetPasswordSchema), ctrl.resetPassword);
authRouter.post('/verify-email', validateBody(verifyEmailSchema), ctrl.verifyEmail);
authRouter.post('/resend-verification', authLimiter, validateBody(resendVerificationSchema), ctrl.resendVerification);

authRouter.get('/me', requireAuth, ctrl.me);
authRouter.patch('/me', requireAuth, csrfProtection, validateBody(updateProfileSchema), ctrl.updateMe);
authRouter.post('/change-password', requireAuth, csrfProtection, validateBody(changePasswordSchema), ctrl.changePassword);
