import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { onboardingValidators } from '../validators/index.js';
import { NotFoundError } from '../errors/index.js';

const router = express.Router();

router.use(authenticateUser);

const updateProfile = async (userId, fields) => {
  const { error } = await supabase
    .from('user_profiles')
    .update(fields)
    .eq('id', userId);

  if (error) throw error;
};

router.post('/name', onboardingValidators.name, validate, async (req, res, next) => {
  try {
    const { displayName } = req.body;
    await updateProfile(req.user.id, { display_name: displayName });
    return res.json({ message: 'Display name updated successfully', displayName });
  } catch (error) {
    next(error);
  }
});

router.post('/age', onboardingValidators.age, validate, async (req, res, next) => {
  try {
    const { ageGroup } = req.body;
    await updateProfile(req.user.id, { age_group: ageGroup });
    return res.json({ message: 'Age group updated successfully', ageGroup });
  } catch (error) {
    next(error);
  }
});

router.post('/pcos-status', onboardingValidators.pcosStatus, validate, async (req, res, next) => {
  try {
    const { pcosStatus } = req.body;
    await updateProfile(req.user.id, { pcos_status: pcosStatus });
    return res.json({ message: 'PCOS status updated successfully', pcosStatus });
  } catch (error) {
    next(error);
  }
});

router.post('/period-regularity', onboardingValidators.periodRegularity, validate, async (req, res, next) => {
  try {
    const { periodRegularity } = req.body;
    await updateProfile(req.user.id, { period_regularity: periodRegularity });
    return res.json({ message: 'Period regularity updated successfully', periodRegularity });
  } catch (error) {
    next(error);
  }
});

router.post('/health-focus', onboardingValidators.healthFocus, validate, async (req, res, next) => {
  try {
    const { healthFocus } = req.body;
    await updateProfile(req.user.id, { health_focus: healthFocus });
    return res.json({ message: 'Health focus areas updated successfully', healthFocus });
  } catch (error) {
    next(error);
  }
});

router.post('/complete', async (req, res, next) => {
  try {
    await updateProfile(req.user.id, {
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    });
    return res.json({ message: 'Onboarding completed successfully', onboardingCompleted: true });
  } catch (error) {
    next(error);
  }
});

router.get('/profile', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) throw new NotFoundError('Profile not found');

    return res.json({ profile: data });
  } catch (error) {
    next(error);
  }
});

export default router;
