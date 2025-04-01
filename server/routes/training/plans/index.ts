import { z } from 'zod';
import { TrainingPlanService } from '../../../services/trainingPlan';
import { validateRequest } from '../../../middleware/validateRequest';
import { authenticateUser } from '../../../middleware/auth';
import { AuthenticatedRequestHandler } from '../../../types/express';
import { createAuthenticatedRouter } from '../../../routes/shared/AuthenticatedRouter';

const router = createAuthenticatedRouter();
const trainingPlanService = new TrainingPlanService();

// Schema for creating a training plan
const createPlanSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  type: z.enum(['5k', '10k', 'half', 'full', 'custom']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced'])
});

// Create a new training plan
const createPlanHandler: AuthenticatedRequestHandler = async (req, res, next) => {
  try {
    const planId = await trainingPlanService.generatePlan({
      userId: req.user.id,
      ...req.body
    });
    res.status(201).json({ id: planId });
  } catch (error) {
    next(error);
  }
};

router.post('/', 
  authenticateUser,
  validateRequest({ body: createPlanSchema }),
  createPlanHandler
);

// Get a training plan
const getPlanHandler: AuthenticatedRequestHandler = async (req, res, next) => {
  try {
    const plan = await trainingPlanService.getPlan(req.params.id);
    res.json(plan);
  } catch (error) {
    next(error);
  }
};

router.get('/:id',
  authenticateUser,
  getPlanHandler
);

// Update plan status
const updatePlanStatusHandler: AuthenticatedRequestHandler = async (req, res, next) => {
  try {
    const plan = await trainingPlanService.updatePlanStatus(
      req.params.id,
      req.body.status
    );
    res.json(plan);
  } catch (error) {
    next(error);
  }
};

router.patch('/:id/status',
  authenticateUser,
  validateRequest({
    body: z.object({
      status: z.enum(['draft', 'active', 'completed'])
    })
  }),
  updatePlanStatusHandler
);

export default router; 