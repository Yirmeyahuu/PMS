export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Returns a specific error message for an invalid email, or '' if valid.
 * Checks for spaces, missing @, missing domain, and overall format.
 */
export const validateEmailDetailed = (email: string): string => {
  const trimmed = email.trim();
  if (!trimmed) return 'Email is required';
  if (/\s/.test(email)) return 'Email must not contain spaces';
  if (!trimmed.includes('@')) return 'Email must contain @';
  const atIdx = trimmed.lastIndexOf('@');
  const local  = trimmed.slice(0, atIdx);
  const domain = trimmed.slice(atIdx + 1);
  if (!local)  return 'Email must have content before @';
  if (!domain) return 'Email must have a domain after @';
  if (!domain.includes('.')) return 'Email must include a valid domain (e.g. .com)';
  const tld = domain.split('.').pop() ?? '';
  if (tld.length < 2) return 'Email domain extension is too short';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Please enter a valid email address';
  return '';
};

import { isValidPHPhone } from './phoneFormatter';

/**
 * Validate international phone number.
 * Delegates to isValidPHPhone from phoneFormatter utility.
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone) return true; // Phone is optional
  return isValidPHPhone(phone);
};
/**
 * Returns a specific error message for an invalid international phone number, or '' if valid.
 */
export const validatePHPhoneDetailed = (value: string, required = true): string => {
  const empty = !value || !value.trim() || value.trim() === '(+63)';
  if (empty) return required ? 'Phone number is required' : '';

  if (!isValidPHPhone(value)) {
    return 'Please enter a valid phone number including country code';
  }

  return '';
};

export const validatePassword = (password: string): { valid: boolean; message: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!/[!@#$%^&*]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (!@#$%^&*)' };
  }
  return { valid: true, message: '' };
};

export const validateName = (name: string): boolean => {
  if (!name || name.trim().length < 2) return false;
  // Only letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  return nameRegex.test(name);
};

export const validateCompanyName = (name: string): boolean => {
  if (!name || name.trim().length < 2) return false;
  return name.trim().length <= 255;
};

export const sanitizeInput = (input: string): string => {
  // Remove HTML tags but keep spaces (don't use trim() as it prevents typing spaces)
  return input.replace(/[<>]/g, '');
};

import { formatPHPhone } from './phoneFormatter';

export const formatPhoneNumber = (phone: string): string => {
  return formatPHPhone(phone);
};
/**
 * Validates a Date of Birth string (YYYY-MM-DD).
 * Ensures the date is valid, >= 1900, and <= today.
 */
export const validateDOB = (dobString: string): string => {
  if (!dobString) return 'Date of Birth is required';
  
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return 'Invalid date format';

  const today = new Date();
  const minDate = new Date('1900-01-01');

  if (dob > today) return 'Date of Birth cannot be in the future';
  if (dob < minDate) return 'Date of Birth must be after 1900';

  return '';
};

/**
 * Calculates age in years from a DOB string (YYYY-MM-DD).
 */
export const calculateAge = (dobString: string): number => {
  const dob = new Date(dobString);
  const today = new Date();
  
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Determines if a patient is a minor (under 18).
 */
export const isMinorAge = (dobString: string): boolean => {
  return calculateAge(dobString) < 18;
};
