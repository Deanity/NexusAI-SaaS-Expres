import { Router } from 'express';
import * as userController from '@/modules/user/user.controller';
import { validate } from '@/shared/middleware/validate';
import { authenticate } from '@/shared/middleware/authenticate';
import { updateMeSchema } from '@/modules/user/user.schema';
import { changePasswordSchema } from '@/modules/auth/auth.schema';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User profile and setting endpoints
 */

router.use(authenticate); // Secure all routes in this file

/**
 * @swagger
 * /api/v1/users/me:
 *   get:
 *     summary: Get currently authenticated user's profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User profile retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [user, admin]
 *                     credits:
 *                       type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/me', userController.getMe);

/**
 * @swagger
 * /api/v1/users/me:
 *   patch:
 *     summary: Update currently authenticated user's name
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Doe
 *     responses:
 *       200:
 *         description: User profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.patch('/me', validate(updateMeSchema), userController.updateMe);

/**
 * @swagger
 * /api/v1/users/me/password:
 *   patch:
 *     summary: Change user password
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 format: password
 *                 example: Password123
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: NewPassword123
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Validation error or incorrect old password
 *       401:
 *         description: Unauthorized
 */
router.patch('/me/password', validate(changePasswordSchema), userController.changePassword);

export default router;
