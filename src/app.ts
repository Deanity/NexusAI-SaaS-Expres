import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { env } from '@/config/env';
import { connectDB } from '@/config/db';
import { checkRedisHealth } from '@/config/redis';
import { errorHandler } from '@/shared/middleware/errorHandler';
import { sendSuccess, sendError } from '@/shared/utils/response';
import { AppError } from '@/shared/errors/AppError';
import authRoutes from '@/modules/auth/auth.routes';
import userRoutes from '@/modules/user/user.routes';
import creditRoutes from '@/modules/credit/credit.routes';
import subscriptionRoutes from '@/modules/subscription/subscription.routes';

const app = express();

// Set up logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: env.NODE_ENV === 'production' ? env.API_BASE_URL : '*',
    credentials: true,
  })
);

// Request compression
app.use(compression());

// Parse JSON request bodies
app.use(express.json());

// Health check endpoint
app.get('/health', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'up' : 'down';
    const redisAlive = await checkRedisHealth();
    const redisStatus = redisAlive ? 'up' : 'down';

    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbStatus,
        cache: redisStatus,
      },
    };

    if (dbStatus === 'down' || redisStatus === 'down') {
      sendError(res, 503, 'Service Unavailable', 'SERVICE_UNAVAILABLE', healthData);
      return;
    }

    sendSuccess(res, 200, 'Server is healthy', healthData);
    return;
  } catch (error) {
    next(error);
  }
});

// Mount API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/credits', creditRoutes);
app.use('/api/v1', subscriptionRoutes);

// 404 handler for unknown routes
app.use((req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
});

// Global Error Handler
app.use(errorHandler);

// Only listen if not running in test environment
if (env.NODE_ENV !== 'test') {
  const startServer = async (): Promise<void> => {
    try {
      // Connect to databases
      await connectDB();
      // Test Redis health on boot
      const redisHealthy = await checkRedisHealth();
      if (!redisHealthy) {
        console.warn('⚠ Redis is not healthy on boot, check configuration.');
      }

      app.listen(env.PORT, () => {
        console.log(`🚀 Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
        console.log(`Swagger docs (disabled in production unless SWAGGER_ENABLED=true)`);
      });
    } catch (error) {
      console.error('❌ Failed to start the server:', error);
      process.exit(1);
    }
  };

  startServer();
}

export default app;
