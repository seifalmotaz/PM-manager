/// <reference types="bun" />
import { describe, test, expect } from 'bun:test'
import { parseTaskInput } from 'shared/nlp-parser'

describe('NLP parser (QuickAdd)', () => {
  test('empty string returns empty title', () => {
    const result = parseTaskInput('')
    expect(result.title).toBe('')
  })

  test('simple title with no shortcuts', () => {
    const result = parseTaskInput('Fix login bug')
    expect(result.title).toBe('Fix login bug')
    expect(result.priority).toBeUndefined()
  })

  test('extracts priority p1', () => {
    const result = parseTaskInput('Fix bug p1')
    expect(result.priority).toBe('p1')
    expect(result.title).toBe('Fix bug')
  })

  test('extracts story points', () => {
    const result = parseTaskInput('sp:5 Refactor module')
    expect(result.storyPoints).toBe(5)
    expect(result.title).toBe('Refactor module')
  })

  test('combined tokens: p0 sp:13 @ahmed tomorrow Review UI', () => {
    const result = parseTaskInput('p0 sp:13 @ahmed tomorrow Review UI')
    expect(result.priority).toBe('p0')
    expect(result.storyPoints).toBe(13)
    expect(result.assigneeUsername).toBe('ahmed')
    expect(result.title).toBe('Review UI')
  })
})