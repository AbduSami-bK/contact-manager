import { ContactFormData } from '../types/contact';

export interface ValidationError {
  field: string;
  message: string;
}

export class ContactValidator {
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePhone(phone: string): boolean {
    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  }

  static validateContact(data: ContactFormData): ValidationError[] {
    const errors: ValidationError[] = [];

    // First name validation
    if (!data.firstName.trim()) {
      errors.push({ field: 'firstName', message: 'First name is required' });
    } else if (data.firstName.trim().length < 2) {
      errors.push({ field: 'firstName', message: 'First name must be at least 2 characters' });
    }

    // Last name validation
    if (!data.lastName.trim()) {
      errors.push({ field: 'lastName', message: 'Last name is required' });
    } else if (data.lastName.trim().length < 2) {
      errors.push({ field: 'lastName', message: 'Last name must be at least 2 characters' });
    }

    // Email validation
    if (!data.email.trim()) {
      errors.push({ field: 'email', message: 'Email is required' });
    } else if (!this.validateEmail(data.email)) {
      errors.push({ field: 'email', message: 'Please enter a valid email address' });
    }

    // Phone validation
    if (!data.phone.trim()) {
      errors.push({ field: 'phone', message: 'Phone number is required' });
    } else if (!this.validatePhone(data.phone)) {
      errors.push({ field: 'phone', message: 'Please enter a valid phone number' });
    }

    // Company validation (optional)
    if (data.company && data.company.trim().length < 2) {
      errors.push({ field: 'company', message: 'Company name must be at least 2 characters' });
    }

    // Job title validation (optional)
    if (data.jobTitle && data.jobTitle.trim().length < 2) {
      errors.push({ field: 'jobTitle', message: 'Job title must be at least 2 characters' });
    }

    // Address validation (optional)
    if (data.address) {
      if (data.address.street && data.address.street.trim().length < 5) {
        errors.push({ field: 'address.street', message: 'Street address must be at least 5 characters' });
      }
      if (data.address.city && data.address.city.trim().length < 2) {
        errors.push({ field: 'address.city', message: 'City must be at least 2 characters' });
      }
      if (data.address.state && data.address.state.trim().length < 2) {
        errors.push({ field: 'address.state', message: 'State must be at least 2 characters' });
      }
      if (data.address.zipCode && !/^\d{5}(-\d{4})?$/.test(data.address.zipCode)) {
        errors.push({ field: 'address.zipCode', message: 'Please enter a valid ZIP code' });
      }
    }

    // Tags validation
    if (data.tags && data.tags.length > 10) {
      errors.push({ field: 'tags', message: 'Maximum 10 tags allowed' });
    }

    return errors;
  }

  static formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // Format based on length
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits[0] === '1') {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 7) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }

    return phone; // Return original if no standard format matches
  }

  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  static sanitizeInput(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  static validateTag(tag: string): boolean {
    return tag.trim().length >= 1 && tag.trim().length <= 20;
  }

  static normalizeTags(tags: string[]): string[] {
    return tags
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .slice(0, 10); // Limit to 10 tags
  }
}
