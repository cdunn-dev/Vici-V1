import { Router, Response, RequestHandler } from 'express';
import { getStravaAuthUrl, exchangeStravaCode, syncStravaActivities } from '../../services/strava';
import { AuthenticatedRequest } from '../shared/types/express';
import { requireAuth } from '../shared/middleware/auth';
import { validateRequest } from '../shared/middleware/validation';
import { z } from 'zod';

const router = Router();

// Strava callback schema
const stravaCallbackSchema = z.object({
  query: z.object({
    code: z.string(),
    state: z.string()
  })
});

// Apply authentication middleware to all routes
router.use(requireAuth);

// Get Strava auth URL with state preservation
const getStravaAuthUrlHandler: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUrl = getStravaAuthUrl(req.user.id);
    res.json({ url: authUrl });
  } catch (error) {
    console.error("Error getting Strava auth URL:", error);
    res.status(500).json({ error: "Failed to get Strava auth URL" });
  }
};

// Exchange Strava code for tokens
const exchangeStravaCodeHandler: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await exchangeStravaCode(req.query.code as string);
    res.redirect("/settings?strava=success");
  } catch (error) {
    console.error("Error exchanging Strava code:", error);
    res.redirect("/settings?strava=error");
  }
};

// Sync Strava activities
const syncStravaActivitiesHandler: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await syncStravaActivities(parseInt(req.user.id), req.user.id);
    res.json({ message: "Strava activities synced successfully" });
  } catch (error) {
    console.error("Error syncing Strava activities:", error);
    res.status(500).json({ error: "Failed to sync Strava activities" });
  }
};

router.get("/strava", getStravaAuthUrlHandler);
router.get("/strava/callback", validateRequest(stravaCallbackSchema), exchangeStravaCodeHandler);
router.post("/strava/sync", syncStravaActivitiesHandler);

export default router; 