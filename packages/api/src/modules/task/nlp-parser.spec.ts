import { describe, test, expect } from 'bun:test'
import { parseTaskInput, type ParsedTaskInput } from './nlp-parser'

describe('nlp-parser', () => {
  describe('empty / whitespace', () => {
    test('empty string returns empty title', () => {
      const result = parseTaskInput('')
      expect(result).toEqual({ title: '' })
    })

    test('whitespace-only string returns empty title', () => {
      const result = parseTaskInput('   ')
      expect(result).toEqual({ title: '' })
    })

    test('no shortcut tokens returns title as-is', () => {
      const result = parseTaskInput('No shortcuts here')
      expect(result).toEqual({ title: 'No shortcuts here' })
    })
  })

  describe('priority extraction', () => {
    test('p1 at end', () => {
      const result = parseTaskInput('Fix bug p1')
      expect(result).toEqual({ title: 'Fix bug', priority: 'p1' })
    })

    test('p0 at start', () => {
      const result = parseTaskInput('p0 Urgent fix')
      expect(result).toEqual({ title: 'Urgent fix', priority: 'p0' })
    })

    test('p3 in middle', () => {
      const result = parseTaskInput('minor p3 thing')
      expect(result).toEqual({ title: 'minor thing', priority: 'p3' })
    })

    test('case insensitive P0', () => {
      const result = parseTaskInput('P0 task')
      expect(result).toEqual({ title: 'task', priority: 'p0' })
    })

    test('p4 is not a valid priority', () => {
      const result = parseTaskInput('p4 task')
      expect(result).toEqual({ title: 'p4 task' })
    })

    test('first match wins with multiple priorities', () => {
      const result = parseTaskInput('p1 p2 task')
      expect(result).toEqual({ title: 'p2 task', priority: 'p1' })
    })
  })

  describe('story points', () => {
    test('sp:5 at end', () => {
      const result = parseTaskInput('task sp:5')
      expect(result).toEqual({ title: 'task', storyPoints: 5 })
    })

    test('sp:0.5 decimal at start', () => {
      const result = parseTaskInput('sp:0.5 small task')
      expect(result).toEqual({ title: 'small task', storyPoints: 0.5 })
    })

    test('sp:13 at start', () => {
      const result = parseTaskInput('sp:13 big task')
      expect(result).toEqual({ title: 'big task', storyPoints: 13 })
    })

    test('SP:3 case insensitive', () => {
      const result = parseTaskInput('SP:3 task')
      expect(result).toEqual({ title: 'task', storyPoints: 3 })
    })

    test('lisp:3 does not match (word boundary)', () => {
      const result = parseTaskInput('lisp:3 task')
      expect(result).toEqual({ title: 'lisp:3 task' })
    })
  })

  describe('assignee extraction', () => {
    test('@username at end', () => {
      const result = parseTaskInput('task @seif')
      expect(result).toEqual({ title: 'task', assigneeUsername: 'seif' })
    })

    test('@username with underscore at start', () => {
      const result = parseTaskInput('@john_doe fix it')
      expect(result).toEqual({ title: 'fix it', assigneeUsername: 'john_doe' })
    })
  })

  describe('due date extraction', () => {
    test('today keyword', () => {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const result = parseTaskInput('task today')
      expect(result.title).toBe('task')
      expect(result.dueDate).toBeInstanceOf(Date)
      expect(result.dueDate!.getFullYear()).toBe(today.getFullYear())
      expect(result.dueDate!.getMonth()).toBe(today.getMonth())
      expect(result.dueDate!.getDate()).toBe(today.getDate())
      expect(result.dueDate!.getHours()).toBe(0)
      expect(result.dueDate!.getMinutes()).toBe(0)
      expect(result.dueDate!.getSeconds()).toBe(0)
    })

    test('tomorrow keyword', () => {
      const now = new Date()
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      const result = parseTaskInput('task tomorrow')
      expect(result.title).toBe('task')
      expect(result.dueDate).toBeInstanceOf(Date)
      expect(result.dueDate!.getFullYear()).toBe(tomorrow.getFullYear())
      expect(result.dueDate!.getMonth()).toBe(tomorrow.getMonth())
      expect(result.dueDate!.getDate()).toBe(tomorrow.getDate())
      expect(result.dueDate!.getHours()).toBe(0)
      expect(result.dueDate!.getMinutes()).toBe(0)
      expect(result.dueDate!.getSeconds()).toBe(0)
    })

    test('yesterday keyword', () => {
      const now = new Date()
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      const result = parseTaskInput('task yesterday')
      expect(result.title).toBe('task')
      expect(result.dueDate).toBeInstanceOf(Date)
      expect(result.dueDate!.getFullYear()).toBe(yesterday.getFullYear())
      expect(result.dueDate!.getMonth()).toBe(yesterday.getMonth())
      expect(result.dueDate!.getDate()).toBe(yesterday.getDate())
      expect(result.dueDate!.getHours()).toBe(0)
      expect(result.dueDate!.getMinutes()).toBe(0)
      expect(result.dueDate!.getSeconds()).toBe(0)
    })

    test('YYYY-MM-DD date', () => {
      const result = parseTaskInput('task 2026-06-15')
      expect(result.title).toBe('task')
      expect(result.dueDate).toBeInstanceOf(Date)
      expect(result.dueDate!.getUTCFullYear()).toBe(2026)
      // getMonth is 0-indexed, June is 5
      expect(result.dueDate!.getUTCMonth()).toBe(5)
      expect(result.dueDate!.getUTCDate()).toBe(15)
      expect(result.dueDate!.getUTCHours()).toBe(0)
      expect(result.dueDate!.getUTCMinutes()).toBe(0)
      expect(result.dueDate!.getUTCSeconds()).toBe(0)
    })

    test('day name (monday)', () => {
      const result = parseTaskInput('monday task')
      expect(result.title).toBe('task')
      expect(result.dueDate).toBeInstanceOf(Date)
      // Verify it's in the future or today
      const now = new Date()
      const diff = result.dueDate!.getTime() - now.getTime()
      expect(diff).toBeGreaterThanOrEqual(-86400000) // allow up to 1 day in the past (today match)
      // Verify hours are midnight
      expect(result.dueDate!.getHours()).toBe(0)
      expect(result.dueDate!.getMinutes()).toBe(0)
      expect(result.dueDate!.getSeconds()).toBe(0)
    })
  })

  describe('combined tokens', () => {
    test('all tokens together', () => {
      const result = parseTaskInput('p1 tomorrow @seif sp:5 My task')
      expect(result).toEqual({
        title: 'My task',
        priority: 'p1',
        storyPoints: 5,
        assigneeUsername: 'seif',
        dueDate: expect.any(Date),
      })
      // Verify tomorrow
      const now = new Date()
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      expect(result.dueDate!.getFullYear()).toBe(tomorrow.getFullYear())
      expect(result.dueDate!.getMonth()).toBe(tomorrow.getMonth())
      expect(result.dueDate!.getDate()).toBe(tomorrow.getDate())
    })

    test('p0 sp:13 @ahmed tomorrow Review UI', () => {
      const result = parseTaskInput('p0 sp:13 @ahmed tomorrow Review UI')
      expect(result).toEqual({
        title: 'Review UI',
        priority: 'p0',
        storyPoints: 13,
        assigneeUsername: 'ahmed',
        dueDate: expect.any(Date),
      })
      const now = new Date()
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      expect(result.dueDate!.getFullYear()).toBe(tomorrow.getFullYear())
      expect(result.dueDate!.getMonth()).toBe(tomorrow.getMonth())
      expect(result.dueDate!.getDate()).toBe(tomorrow.getDate())
    })

    test('tokens at end', () => {
      const result = parseTaskInput('Review UI p0 sp:13 @ahmed tomorrow')
      expect(result).toEqual({
        title: 'Review UI',
        priority: 'p0',
        storyPoints: 13,
        assigneeUsername: 'ahmed',
        dueDate: expect.any(Date),
      })
      const now = new Date()
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      expect(result.dueDate!.getFullYear()).toBe(tomorrow.getFullYear())
      expect(result.dueDate!.getMonth()).toBe(tomorrow.getMonth())
      expect(result.dueDate!.getDate()).toBe(tomorrow.getDate())
    })
  })

  describe('edge cases', () => {
    test('all tokens consumed leaves empty title', () => {
      const result = parseTaskInput('p1 sp:3 @user tomorrow')
      expect(result.title).toBe('')
      expect(result.priority).toBe('p1')
      expect(result.storyPoints).toBe(3)
      expect(result.assigneeUsername).toBe('user')
      expect(result.dueDate).toBeInstanceOf(Date)
    })

    test('consecutive whitespace cleaned', () => {
      const result = parseTaskInput('p1  my   task  ')
      expect(result).toEqual({ title: 'my task', priority: 'p1' })
    })
  })
})
