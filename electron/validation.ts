export const UNIT_VALUES = ['inches', 'feet'] as const;
export const ITEM_TYPES = ['door_window', 'chaukhat', 'railing', 'fix_gola', 'moulding'] as const;
export const ORDER_STATUSES = ['pending', 'in_progress', 'completed', 'delivered'] as const;
export const PAYMENT_STATUSES = ['pending', 'paid'] as const;

export const SETTINGS_KEYS = [
  'activation_code',
  'default_door_unit',
  'default_chaukhat_unit',
  'default_railing_unit',
  'default_fix_gola_unit',
  'default_moulding_unit',
  'default_door_rate',
  'default_chaukhat_rate',
  'default_railing_rate',
  'default_fix_gola_rate',
  'default_moulding_rate',
  'zoom_factor'
] as const;

type AllowedValue = readonly string[];

export function assertPositiveInt(value: unknown, label: string): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0 || numeric > Number.MAX_SAFE_INTEGER) {
    throw new Error(`${label} must be a valid positive number.`);
  }
  return numeric;
}

export function assertFiniteNumber(
  value: unknown,
  label: string,
  options: { min?: number; max?: number; integer?: boolean } = {}
): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  const min = options.min ?? Number.NEGATIVE_INFINITY;
  const max = options.max ?? Number.POSITIVE_INFINITY;

  if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }
  if (options.integer && !Number.isInteger(numeric)) {
    throw new Error(`${label} must be a whole number.`);
  }
  return numeric;
}

export function assertEnum<T extends AllowedValue>(value: unknown, allowed: T, label: string): T[number] {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new Error(`${label} is not valid.`);
  }
  return value as T[number];
}

export function sanitizeText(value: unknown, label: string, maxLength: number, required = false): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (required && text.length === 0) {
    throw new Error(`${label} is required.`);
  }
  if (text.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }
  return text;
}

export function sanitizeSettingValue(key: string, value: unknown): string {
  const stringValue = typeof value === 'string' ? value.trim() : String(value ?? '').trim();

  if (
    key === 'default_door_unit' ||
    key === 'default_chaukhat_unit' ||
    key === 'default_railing_unit' ||
    key === 'default_fix_gola_unit' ||
    key === 'default_moulding_unit'
  ) {
    return assertEnum(stringValue, UNIT_VALUES, 'Unit');
  }

  if (
    key === 'default_door_rate' ||
    key === 'default_chaukhat_rate' ||
    key === 'default_railing_rate' ||
    key === 'default_fix_gola_rate' ||
    key === 'default_moulding_rate'
  ) {
    return String(assertFiniteNumber(stringValue, 'Default rate', { min: 0, max: 10_000_000 }));
  }

  if (key === 'zoom_factor') {
    return String(assertFiniteNumber(stringValue, 'Zoom factor', { min: 0.8, max: 1.5 }));
  }

  if (key === 'activation_code') {
    return sanitizeText(stringValue, 'Activation code', 32, true).toUpperCase();
  }

  throw new Error('Setting key is not allowed.');
}
