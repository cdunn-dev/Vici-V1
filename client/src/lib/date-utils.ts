import { format, parseISO } from "date-fns";
import { ErrorMessages } from "./error-utils";

/**
 * Formats a date string into a display format
 * @param dateString - ISO date string
 * @param formatStr - Date-fns format string (default: "MMM d, yyyy")
 * @returns Formatted date string or "Invalid date" if parsing fails
 */
export const formatDate = (dateString: string, formatStr: string = "MMM d, yyyy"): string => {
  try {
    if (!dateString || typeof dateString !== 'string') {
      return "Invalid date";
    }
    const parsedDate = parseISO(dateString);
    if (isNaN(parsedDate.getTime())) {
      return "Invalid date";
    }
    return format(parsedDate, formatStr);
  } catch (error) {
    console.error("Date formatting error:", error);
    return "Invalid date";
  }
};

/**
 * Converts a date to API-compatible format (YYYY-MM-DD)
 * @param dateString - Any valid date string
 * @returns ISO date string without time component
 * @throws Error if date is invalid
 */
export const formatDateForApi = (dateString: string): string => {
  if (!dateString || typeof dateString !== 'string') {
    throw new Error(ErrorMessages.INVALID_DATE);
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error(ErrorMessages.INVALID_DATE);
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
    if (!dateString || typeof dateString !== 'string') {
      return false;
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return false;
    }

    // Check for invalid date combinations
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);

      // Basic date validation
      if (month < 1 || month > 12) return false;
      if (day < 1 || day > 31) return false;

      // Check specific month lengths
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day > daysInMonth) return false;
    }

    return true;
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
    if (!isValidDate(dateString)) {
      return null;
    }
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};