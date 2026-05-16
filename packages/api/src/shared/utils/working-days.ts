const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5] // Monday to Friday

export function parseWorkingDays(raw: string | null): number[] {
  if (!raw) return DEFAULT_WORKING_DAYS
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.every(n => typeof n === 'number')) {
      return parsed
    }
    return DEFAULT_WORKING_DAYS
  } catch {
    return DEFAULT_WORKING_DAYS
  }
}

export function serializeWorkingDays(days: number[]): string {
  return JSON.stringify(days)
}