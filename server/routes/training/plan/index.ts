import { Router, Response } from 'express';
import { generateTrainingPlan } from '../../../services/training-plan-generator';
import { AuthenticatedRequest } from '../../shared/types/express';
import { validateRequest } from '../../shared/middleware/validation';
import { trainingPlanSchema } from './schema';
import { AuthenticatedRequestHandler } from '../../shared/types/express';

const router = Router();

// Generate training plan
router.post("/", validateRequest(trainingPlanSchema), (async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plan = await generateTrainingPlan(req.body);
    res.json(plan);
  } catch (error) {
    console.error("Error generating training plan:", error);
    res.status(500).json({ error: "Failed to generate training plan" });
  }
}) as AuthenticatedRequestHandler);

export default router; 