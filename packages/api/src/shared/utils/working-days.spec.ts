import { describe, it, expect } from 'bun:test'
import { parseWorkingDays, serializeWorkingDays } from './working-days'

describe('parseWorkingDays', () => {
  it('parses valid JSON array', () => {
    expect(parseWorkingDays('[1,2,3,4,5]')).toEqual([1, 2, 3, 4, 5])
    expect(parseWorkingDays('[1,3,5]')).toEqual([1, 3, 5])
    expect(parseWorkingDays('[]')).toEqual([])
  })

  it('returns default for null', () => {
    expect(parseWorkingDays(null)).toEqual([1, 2, 3, 4, 5])
  })

  it('returns default for malformed JSON', () => {
    expect(parseWorkingDays('not json')).toEqual([1, 2, 3, 4, 5])
    expect(parseWorkingDays('{"key": "value"}')).toEqual([1, 2, 3, 4, 5])
    expect(parseWorkingDays('[1, "two", 3]')).toEqual([1, 2, 3, 4, 5])
  })

  it('returns default for non-array values', () => {
    expect(parseWorkingDays('"monday"')).toEqual([1, 2, 3, 4, 5])
  })
})

describe('serializeWorkingDays', () => {
  it('serializes array to JSON string', () => {
    expect(serializeWorkingDays([1, 2, 3, 4, 5])).toBe('[1,2,3,4,5]')
    expect(serializeWorkingDays([1, 3, 5])).toBe('[1,3,5]')
    expect(serializeWorkingDays([])).toBe('[]')
  })
})