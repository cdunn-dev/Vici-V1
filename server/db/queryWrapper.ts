import { db } from '../db';
import { MonitoringService } from '../services/monitoring';
import { performance } from 'perf_hooks';
import { SQL } from 'drizzle-orm';

/**
 * Wraps database queries to track performance metrics
 */
export class QueryWrapper {
  /**
   * Execute a query and track its performance
   * @param query The query to execute
   * @param params The parameters for the query
   * @returns The result of the query
   */
  public static async execute<T>(query: SQL, params: any[] = []): Promise<T> {
    const startTime = performance.now();
    
    try {
      // Execute the query
      const result = await db.execute(query);
      
      // Track the query performance
      MonitoringService.getInstance().trackQuery(
        query.toString(),
        params,
        startTime
      );
      
      return result as T;
    } catch (error) {
      // Track the query error
      MonitoringService.getInstance().trackQuery(
        query.toString(),
        params,
        startTime
      );
      
      // Re-throw the error
      throw error;
    }
  }
  
  /**
   * Execute a query and track its performance with a custom query string
   * @param queryString The query string to log
   * @param query The actual query to execute
   * @param params The parameters for the query
   * @returns The result of the query
   */
  public static async executeWithCustomLog<T>(
    queryString: string,
    query: SQL,
    params: any[] = []
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      // Execute the query
      const result = await db.execute(query);
      
      // Track the query performance with the custom query string
      MonitoringService.getInstance().trackQuery(
        queryString,
        params,
        startTime
      );
      
      return result as T;
    } catch (error) {
      // Track the query error with the custom query string
      MonitoringService.getInstance().trackQuery(
        queryString,
        params,
        startTime
      );
      
      // Re-throw the error
      throw error;
    }
  }
} 