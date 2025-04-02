import { Request, Response, NextFunction } from 'express';
import { MonitoringService } from '../services/monitoring';
import { performance } from 'perf_hooks';

/**
 * Middleware to log all database queries
 * This should be applied to all routes that interact with the database
 */
export const queryLogger = (req: Request, res: Response, next: NextFunction) => {
  // Store the original end method
  const originalEnd = res.end;
  const originalJson = res.json;
  
  // Track the start time
  const startTime = performance.now();
  
  // Override the end method to log the response time
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const duration = performance.now() - startTime;
    
    // Log the request details
    MonitoringService.getInstance().trackQuery(
      `${req.method} ${req.originalUrl}`,
      [req.params, req.query, req.body],
      startTime
    );
    
    // Call the original end method
    return originalEnd.call(this, chunk, encoding, cb);
  };
  
  // Override the json method to log the response time for JSON responses
  res.json = function(body: any) {
    const duration = performance.now() - startTime;
    
    // Log the request details
    MonitoringService.getInstance().trackQuery(
      `${req.method} ${req.originalUrl}`,
      [req.params, req.query, req.body],
      startTime
    );
    
    // Call the original json method
    return originalJson.call(this, body);
  };
  
  next();
}; 