import { format, parseISO } from "date-fns";

/**
 * Formats a date string into a display format
 * @param dateString - ISO date string
 * @param formatStr - Date-fns format string (default: "MMM d, yyyy")
 * @returns Formatted date string or "Invalid date" if parsing fails
 */
export const formatDate = (dateString: string, formatStr: string = "MMM d, yyyy"): string => {
  try {
    return format(parseISO(dateString), formatStr);
  } catch (error) {
    console.error("Date formatting error:", error);
    return "Invalid date";
  }
};

/**
 * Converts a date to API-compatible format (YYYY-MM-DD)
 * @param dateString - Any valid date string
 * @returns ISO date string without time component
 */
export const formatDateForApi = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error("Date API formatting error:", error);
    throw new Error(`Invalid date format: ${dateString}`);
  }
};

/**
 * Validates a date string
 * @param dateString - Date string to validate
 * @returns boolean indicating if date is valid
 */
export const isValidDate = (dateString: string): boolean => {
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
};

/**
 * Safely parses a date string to a Date object
 * @param dateString - Date string to parse
 * @returns Date object or null if invalid
 */
export const parseDate = (dateString: string): Date | null => {
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};
