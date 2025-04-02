import { MonitoringService } from '../../services/monitoring';
import { isAdmin } from '../../middleware/admin';
import { createAuthenticatedRouter } from '../shared/AuthenticatedRouter';
import { Response } from 'express';

const router = createAuthenticatedRouter();

/**
 * Get query metrics
 * @route GET /api/admin/monitoring/queries
 */
router.get('/queries', isAdmin, (req, res: Response) => {
  const metrics = MonitoringService.getInstance().getQueryMetrics();
  res.json(metrics);
});

/**
 * Get database metrics
 * @route GET /api/admin/monitoring/database
 */
router.get('/database', isAdmin, (req, res: Response) => {
  const metrics = MonitoringService.getInstance().getDatabaseMetrics();
  res.json(metrics);
});

/**
 * Get application metrics
 * @route GET /api/admin/monitoring/application
 */
router.get('/application', isAdmin, (req, res: Response) => {
  const metrics = MonitoringService.getInstance().getApplicationMetrics();
  res.json(metrics);
});

/**
 * Get performance alerts
 * @route GET /api/admin/monitoring/alerts
 */
router.get('/alerts', isAdmin, (req, res: Response) => {
  const alerts = MonitoringService.getInstance().getPerformanceAlerts();
  res.json(alerts);
});

/**
 * Set slow query threshold
 * @route POST /api/admin/monitoring/slow-query-threshold
 */
router.post('/slow-query-threshold', isAdmin, (req, res: Response) => {
  const { threshold } = req.body;
  
  if (typeof threshold !== 'number' || threshold <= 0) {
    res.status(400).json({ error: 'Invalid threshold value' });
    return;
  }
  
  MonitoringService.getInstance().setSlowQueryThreshold(threshold);
  res.json({ success: true, threshold });
});

/**
 * Get slow query threshold
 * @route GET /api/admin/monitoring/slow-query-threshold
 */
router.get('/slow-query-threshold', isAdmin, (req, res: Response) => {
  const threshold = MonitoringService.getInstance().getSlowQueryThreshold();
  res.json({ threshold });
});

export default router; 