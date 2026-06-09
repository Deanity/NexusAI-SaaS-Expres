import swaggerJSDoc from 'swagger-jsdoc';
import { env } from '@/config/env';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NexusAI Backend API',
      version: '1.0.0',
      description:
        'NexusAI is a production-ready AI SaaS backend platform that provides multi-model AI chat, conversation history, credit-based billing, subscription plans, API key management, and usage analytics through a secure, scalable Node.js/Express REST API.',
    },
    servers: [
      {
        url: env.API_BASE_URL,
        description: 'NexusAI API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token in the format: Bearer <token>',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'Enter your active API Key (e.g. nxai_...)',
        },
      },
    },
  },
  apis: [
    process.env.NODE_ENV === 'production'
      ? './dist/modules/**/*.routes.js'
      : './src/modules/**/*.routes.ts',
    process.env.NODE_ENV === 'production' ? './dist/app.js' : './src/app.ts',
  ],
};

export const specs = swaggerJSDoc(options);
