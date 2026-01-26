// Re-export all types from individual modules
export * from './auth';
export * from './patient';
export * from './appointment';

// Common types
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  detail?: string;
  [key: string]: any;
}