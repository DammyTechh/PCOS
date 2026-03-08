import express from 'express';
import { createClient } from '@supabase/supabase-js';
import supabase, { supabaseAdmin } from '../config/supabase.js';
import { validate } from '../middleware/validate.js';
import { authValidators } from '../validators/index.js';
import { generateOTP, isOTPExpired, getOTPExpiryTime, hasExceededAttempts } from '../utils/otp.js';
import { sendOTPEmail } from '../utils/email.js';
import { ValidationError, ConflictError, NotFoundError, AppError } from '../errors/index.js';

const router = express.Router();

const getAuthedClient = (accessToken) => {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

router.post('/email/check', authValidators.email, validate, async (req, res, next) => {
  try {
    const { email } = req.body;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;

    const exists = data !== null;
    return res.json({ exists, flow: exists ? 'login' : 'register' });
  } catch (error) {
    next(error);
  }
});

router.post('/email/send-otp', authValidators.email, validate, async (req, res, next) => {
  try {
    const { email } = req.body;

    const otpCode = generateOTP();
    const expiresAt = getOTPExpiryTime();

    const { data: verification, error: insertError } = await supabase
      .from('email_verifications')
      .insert({ email, otp_code: otpCode, expires_at: expiresAt, verified: false, attempts: 0 })
      .select()
      .single();

    if (insertError) throw insertError;

    await sendOTPEmail(email, otpCode);

    return res.json({
      message: 'Verification code sent to your email',
      verificationId: verification.id,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/email/verify', authValidators.verifyOtp, validate, async (req, res, next) => {
  try {
    const { email, code } = req.body;

    const { data: verification, error: fetchError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!verification) {
      throw new NotFoundError('No pending verification found. Please request a new code.');
    }

    if (hasExceededAttempts(verification.attempts)) {
      throw new ValidationError('Too many failed attempts. Please request a new code.');
    }

    if (isOTPExpired(verification.expires_at)) {
      throw new ValidationError('Verification code has expired. Please request a new one.');
    }

    if (verification.otp_code !== code) {
      await supabase
        .from('email_verifications')
        .update({ attempts: verification.attempts + 1 })
        .eq('id', verification.id);

      const remaining = 5 - (verification.attempts + 1);
      throw new ValidationError(
        remaining > 0
          ? `Invalid verification code. ${remaining} attempt(s) remaining.`
          : 'No attempts remaining. Please request a new code.'
      );
    }

    await supabase
      .from('email_verifications')
      .update({ verified: true })
      .eq('id', verification.id);

    return res.json({ message: 'Email verified successfully', verified: true, email });
  } catch (error) {
    next(error);
  }
});

router.post('/email/resend', authValidators.email, validate, async (req, res, next) => {
  try {
    const { email } = req.body;

    await supabase
      .from('email_verifications')
      .update({ attempts: 99 })
      .eq('email', email)
      .eq('verified', false);

    const otpCode = generateOTP();
    const expiresAt = getOTPExpiryTime();

    const { data: verification, error: insertError } = await supabase
      .from('email_verifications')
      .insert({ email, otp_code: otpCode, expires_at: expiresAt, verified: false, attempts: 0 })
      .select()
      .single();

    if (insertError) throw insertError;

    await sendOTPEmail(email, otpCode);

    return res.json({
      message: 'A new verification code has been sent to your email',
      verificationId: verification.id,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/password/create', authValidators.createPassword, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Ensure email was verified via OTP
    const { data: verification, error: verifyError } = await supabase
      .from('email_verifications')
      .select('id')
      .eq('email', email)
      .eq('verified', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (verifyError) throw verifyError;

    if (!verification) {
      throw new ValidationError(
        'Email has not been verified. Please complete OTP verification first.'
      );
    }

    // 2. Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      throw new ConflictError('An account with this email already exists. Please log in instead.');
    }

    let user, session;

    if (supabaseAdmin) {
      // PATH A: Service role key available → create confirmed user, then insert profile as admin
      const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { email_verified: true },
      });

      if (adminError) throw adminError;
      user = adminData?.user;
      session = null;

      // Insert profile using admin client (bypasses RLS)
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({ id: user.id, email, onboarding_completed: false });

      if (profileError) throw profileError;

    } else {
      // PATH B: No service role key → use anon signUp, then insert profile using the user's own session token
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
          data: { email_verified: true },
        },
      });

      if (signUpError) {
        if (signUpError.message?.toLowerCase().includes('already registered')) {
          throw new ConflictError('An account with this email already exists.');
        }
        throw signUpError;
      }

      user = authData?.user;
      session = authData?.session;

      if (!user) {
        throw new AppError('Account creation failed. Please try again.', 500, 'ACCOUNT_CREATION_FAILED');
      }

      if (session?.access_token) {
        // Use the user's own access token to insert their profile (satisfies RLS)
        const authedClient = getAuthedClient(session.access_token);
        const { error: profileError } = await authedClient
          .from('user_profiles')
          .insert({ id: user.id, email, onboarding_completed: false });

        if (profileError) throw profileError;
      } else {
        // No session yet (email confirmation pending in Supabase) — skip profile insert for now
        // Profile will be created on first login
        console.warn('[Auth] No session on signUp — email confirmation may be required in Supabase.');
      }
    }

    if (!user) {
      throw new AppError('Account creation failed. Please try again.', 500, 'ACCOUNT_CREATION_FAILED');
    }

    // 3. Invalidate the used OTP verification
    await supabase
      .from('email_verifications')
      .update({ verified: false })
      .eq('email', email)
      .eq('id', verification.id);

    return res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
      session: session
        ? {
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresAt: session.expires_at,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', authValidators.createPassword, validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      if (
        signInError.message?.toLowerCase().includes('invalid') ||
        signInError.message?.toLowerCase().includes('credentials')
      ) {
        throw new ValidationError('Invalid email or password.');
      }
      throw signInError;
    }

    if (!authData?.user || !authData?.session) {
      throw new AppError('Login failed. Please try again.', 500, 'LOGIN_FAILED');
    }

    // Ensure profile exists (handles case where signUp had no session)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (!profile) {
      const authedClient = getAuthedClient(authData.session.access_token);
      await authedClient
        .from('user_profiles')
        .insert({ id: authData.user.id, email, onboarding_completed: false })
        .select()
        .maybeSingle();
    }

    return res.json({
      message: 'Logged in successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        createdAt: authData.user.created_at,
      },
      session: {
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
        expiresAt: authData.session.expires_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/token/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Refresh token is required.');
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data?.session) {
      throw new ValidationError('Invalid or expired refresh token. Please log in again.');
    }

    return res.json({
      message: 'Token refreshed successfully',
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      await supabase.auth.signOut();
    }
    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/password/forgot', authValidators.email, validate, async (req, res, next) => {
  try {
    const { email } = req.body;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (profile) {
      const redirectTo =
        process.env.PASSWORD_RESET_REDIRECT_URL ||
        `${process.env.APP_URL || 'http://localhost:3000'}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) console.error('[Password Reset] Supabase error:', error.message);
    }

    return res.json({
      message: 'If an account with this email exists, a password reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
