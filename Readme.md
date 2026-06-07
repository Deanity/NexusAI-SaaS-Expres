# NexusAI Backend API

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg?style=flat-square)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg?style=flat-square)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg?style=flat-square)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7.x-red.svg?style=flat-square)](https://redis.io/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

NexusAI is a production-ready AI SaaS backend platform that provides multi-model AI chat, conversation history, credit-based billing, subscription plans, API key management, and usage analytics through a secure, scalable Node.js/Express REST API.

---

## 🚀 Key Features

*   **Authentication (JWT + Refresh Token)**: Dual-token system with rotation, device limit verification, and lockout protection (tracked via Redis).
*   **Role-Based Access Control (RBAC)**: Support for `user` and `admin` roles, along with API key scoping checks.
*   **Multi-Model AI Chat**: Direct integration with multiple models (Gemini-1.5-pro, Gemini-1.5-flash active by default) using a custom provider router.
*   **Conversation History**: Paginated, pinned, and soft-delete archive support.
*   **Credit & Ledger System**: Atomic credit deduction with transaction logging.
*   **Subscription Architecture**: Tier-based subscription plans, active status lifecycle, and automated credit renewal jobs.
*   **API Key Management**: Secure SHA-256 hashed API key validation, prefix display, rotation, and usage statistics.
*   **Usage Analytics**: Advanced user and admin level metrics, rollup calculations, and Redis caching.
*   **Background Jobs (BullMQ)**: Managed task queues for transactional emails, subscriptions, API key logging, and cleanup tasks.
*   **Security & Optimization**: Helmet headers, CORS, request compression, Redis sliding window rate-limiting, and cache invalidation rules.

---

## 👥 Target Users

*   **Developers**: Need robust API key management, multi-model AI integrations, and detailed usage analytics.
*   **Startups**: Want a ready-to-use credit-based billing and subscription architecture to launch AI SaaS apps fast.
*   **Businesses**: Require role-based access control (RBAC), team-level usage control, and audit trails.
*   **Content Creators**: Need conversation history management, custom prompt settings, and multi-model access.

---

## 🛠️ Tech Stack

*   **Language & Runtime**: TypeScript (Strict Mode) & Node.js (v20+)
*   **Framework**: Express.js
*   **Database**: MongoDB (Mongoose ODM)
*   **Caching & Queue**: Redis (ioredis) & BullMQ
*   **Validation**: Zod
*   **Documentation**: Swagger UI (`swagger-jsdoc` + `swagger-ui-express`)
*   **Testing**: Jest & Supertest
*   **Containerization**: Docker & Docker Compose
*   **Package Manager**: `pnpm` (required)

---

## 📂 Project Structure

The project follows a **Feature-based (Domain-Driven)** architecture:

```
nexusai-api/
├── src/
│   ├── config/           # Environment config, DB connection, Redis, BullMQ
│   ├── modules/          # Feature modules (one folder per domain)
│   │   ├── auth/         # JWT, refresh token, email verification
│   │   ├── user/         # User profile, role management
│   │   ├── ai/           # AI chat, multi-model routing
│   │   ├── conversation/ # Conversation history CRUD
│   │   ├── credit/       # Credit ledger, deduction, top-up
│   │   ├── apikey/       # API key generation and management
│   │   ├── subscription/ # Plans, user subscriptions
│   │   ├── analytics/    # Usage stats, aggregation queries
│   │   └── admin/        # Admin-only endpoints
│   ├── shared/
│   │   ├── middleware/   # Auth, RBAC, rate limit, error handler
│   │   ├── utils/        # Helpers: hash, token, pagination, response
│   │   ├── types/        # Shared TypeScript types and interfaces
│   │   └── errors/       # Custom error classes (AppError, etc.)
│   ├── jobs/             # BullMQ job processors (email, analytics)
│   ├── docs/             # Swagger definitions
│   └── app.ts            # Express app setup
├── tests/
│   ├── unit/
│   └── integration/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── .github/
│   └── workflows/
│       └── ci.yml
├── .env.example
├── GEMINI.md
└── package.json
```

---

## ⚙️ Getting Started

### Prerequisites

Ensure you have the following installed on your system:
*   [Node.js](https://nodejs.org/) (v20 or higher)
*   [pnpm](https://pnpm.io/) package manager
*   [Docker](https://www.docker.com/) (for running local Redis container)
*   MongoDB Atlas Account (or local MongoDB database instance)

---

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd nexusai

# Install dependencies using pnpm
pnpm install
```

### Step 2: Set Up Services

#### A. Start Redis Container
Run this command to create and run a background Redis container:

```bash
docker run -d \
  --name nexusai-redis \
  -p 6379:6379 \
  -v nexusai_redis_data:/data \
  redis:7-alpine redis-server --appendonly yes
```

#### B. Setup MongoDB Atlas
1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com/).
2. Create a database user with `readWrite` access permissions on the `nexusai` database.
3. Whitelist IP access `0.0.0.0/0` (or your specific IP).
4. Copy the connection string (e.g. `mongodb+srv://...`).

---

### Step 3: Configure Environment Variables

Create a `.env` file in the root directory by copying the example environment file:

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:
*   `MONGODB_URI`: Your MongoDB Atlas connection string.
*   `REDIS_URL`: `redis://localhost:6379`
*   `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`: Random 64-char strings.
*   `GOOGLE_AI_API_KEY`: Your Google AI SDK API key (for Gemini models).
*   `RESEND_API_KEY`: Your Resend or SMTP credentials for transactional emails.

---

### Step 4: Run the Application

```bash
# Run database seeder (seeds plans, admin user)
pnpm db:seed

# Start the development server (auto-reload via ts-node-dev)
pnpm dev
```

The server will start at `http://localhost:3000`.

---

## 🛠️ Commands Reference

Run these commands in the project root:

```bash
# Development
pnpm dev              # Run dev server with ts-node-dev
pnpm build            # Compile TypeScript to dist/
pnpm start            # Run compiled production build

# Code Quality
pnpm lint             # Run ESLint check
pnpm format           # Run Prettier format
pnpm typecheck        # Check types (tsc --noEmit)

# Testing
pnpm test             # Run all tests
pnpm test:unit        # Unit tests only
pnpm test:integration # Integration tests only
pnpm test:coverage    # Generate test coverage report

# Database
pnpm db:seed          # Seed initial data (plans, admin user)
pnpm db:reset         # Drop all collections and re-seed

# Docker
docker compose up -d            # Start all services inside Docker
docker compose down             # Stop Docker services
docker compose logs -f api      # Stream API logs
```

---

## 📖 API Documentation

Once the server is running, you can access the interactive API Swagger Documentation at:

`http://localhost:3000/api/v1/docs`

> **Note**: Swagger is enabled by default in development mode. In production, ensure `SWAGGER_ENABLED=true` is set in the environment variables.

---

## 👥 Credits & Contact

<div align="left">
  <a href="https://www.instagram.com/shoyou.nt/" target="_blank">
    <img src="https://img.shields.io/static/v1?message=Instagram&logo=instagram&label=&color=E4405F&logoColor=white&labelColor=&style=for-the-badge" height="35" alt="instagram logo" />
  </a>
  <a href="https://discord.com/" target="_blank">
    <img src="https://img.shields.io/static/v1?message=Discord&logo=discord&label=&color=7289DA&logoColor=white&labelColor=&style=for-the-badge" height="35" alt="discord logo" />
  </a>
  <a href="mailto:dendradetama2@gmail.com" target="_blank">
    <img src="https://img.shields.io/static/v1?message=Gmail&logo=gmail&label=&color=D14836&logoColor=white&labelColor=&style=for-the-badge" height="35" alt="gmail logo" />
  </a>
  <a href="https://www.linkedin.com/in/dendra-de-tama/" target="_blank">
    <img src="https://img.shields.io/static/v1?message=LinkedIn&logo=linkedin&label=&color=0077B5&logoColor=white&labelColor=&style=for-the-badge" height="35" alt="linkedin logo" />
  </a>
</div>

<br/>

<div align="center">
  <i>"Code is art. Make it beautiful."</i> — De4nity
</div>
