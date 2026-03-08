/**
 * @swagger
 * /auth/email/check:
 *   post:
 *     summary: Check if an email is registered
 *     description: Returns whether the email exists and which flow to follow — login or register.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Email check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                 flow:
 *                   type: string
 *                   enum: [login, register]
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /auth/email/send-otp:
 *   post:
 *     summary: Send OTP to email
 *     description: >
 *       Generates a 6-digit OTP, stores it with a 10-minute expiry, and dispatches a
 *       verification email via Supabase Auth. Requires Supabase SMTP to be configured
 *       in your Supabase project (Dashboard → Auth → SMTP Settings).
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 verificationId:
 *                   type: string
 *                   format: uuid
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /auth/email/verify:
 *   post:
 *     summary: Verify the OTP code
 *     description: >
 *       Validates the 6-digit OTP. Max 5 attempts before lockout.
 *       Returns remaining attempts on failure.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               code:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 verified:
 *                   type: boolean
 *                 email:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /auth/email/resend:
 *   post:
 *     summary: Resend OTP verification code
 *     description: Invalidates previous unverified OTPs and sends a fresh code.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 verificationId:
 *                   type: string
 *                   format: uuid
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */

/**
 * @swagger
 * /auth/password/create:
 *   post:
 *     summary: Create account with password
 *     description: >
 *       Registers a new user account after email OTP verification.
 *       Password must be ≥ 8 characters and contain at least one number and one letter.
 *       Returns a JWT session on success. If SUPABASE_SERVICE_ROLE_KEY is set, the
 *       account is created with email_confirm = true (no confirmation email needed).
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePass1
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/AuthUser'
 *                 session:
 *                   $ref: '#/components/schemas/Session'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in with email and password
 *     description: Authenticates a registered user and returns a JWT access and refresh token.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: SecurePass1
 *     responses:
 *       200:
 *         description: Logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/AuthUser'
 *                 session:
 *                   $ref: '#/components/schemas/Session'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /auth/token/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Uses a valid refresh token to issue a new access token and refresh token pair.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: your-refresh-token-here
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 session:
 *                   $ref: '#/components/schemas/Session'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out current user
 *     description: Invalidates the current session. Pass the Bearer token in the Authorization header.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /auth/password/forgot:
 *   post:
 *     summary: Request a password reset link
 *     description: >
 *       Sends a password reset email if the email is registered. Always returns the same
 *       response regardless of whether the email exists (prevents email enumeration).
 *       Requires PASSWORD_RESET_REDIRECT_URL or APP_URL in your .env.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Reset email sent (if account exists)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
