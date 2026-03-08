import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PCOS API',
      version: '1.0.0',
      description:
        'Authentication, onboarding, and period tracking API for PCOSAPI, powered by Supabase.',
      contact: { name: 'PCOSAPI Team' },
    },
    servers: [
      { url: 'http://localhost:3000/api/v1', description: 'Development' },
      { url: 'https://your-domain.com/api/v1', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'JWT access token from Supabase. Obtain via POST /auth/login or POST /auth/password/create.',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
        AuthUser: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Session: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', description: 'JWT — use as Bearer token' },
            refreshToken: { type: 'string' },
            expiresAt: { type: 'integer', description: 'Unix timestamp' },
          },
        },
        UserProfile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            display_name: { type: 'string', nullable: true },
            age_group: { type: 'string', nullable: true },
            pcos_status: { type: 'string', nullable: true },
            period_regularity: { type: 'string', nullable: true },
            health_focus: { type: 'array', items: { type: 'string' } },
            onboarding_completed: { type: 'boolean' },
            onboarding_completed_at: { type: 'string', format: 'date-time', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        PeriodLog: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date', nullable: true },
            notes: { type: 'string', nullable: true },
            is_first_log: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
      responses: {
        ValidationError: {
          description: 'Validation or business logic error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Invalid email address', code: 'VALIDATION_ERROR' },
            },
          },
        },
        UnauthorizedError: {
          description: 'Missing or invalid JWT token',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Invalid or expired token', code: 'UNAUTHORIZED' },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Resource not found', code: 'NOT_FOUND' },
            },
          },
        },
        ConflictError: {
          description: 'Resource already exists',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'An account with this email already exists', code: 'CONFLICT' },
            },
          },
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { error: 'Internal server error', code: 'INTERNAL_ERROR' },
            },
          },
        },
      },
    },
    security: [],
    tags: [
      { name: 'Authentication', description: 'Register, login, OTP verification, token management' },
      { name: 'Onboarding', description: 'Step-by-step user profile setup' },
      { name: 'Period Tracking', description: 'Log and manage period cycles' },
    ],
  },
  apis: ['./src/docs/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
