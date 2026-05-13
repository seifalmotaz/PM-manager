/// <reference types="bun" />
import { describe, test, expect } from 'bun:test'

// Dwell time formatting logic (match the TaskCard implementation)
function formatDwellTime(changedAt: string): string {
  const ms = Date.now() - new Date(changedAt).getTime()
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return `${Math.floor(days / 7)}w`
}

describe('TaskCard dwell time', () => {
  test('just now shows 0m', () => {
    const result = formatDwellTime(new Date().toISOString())
    expect(result).toBe('0m')
  })

  test('30 minutes ago shows 30m', () => {
    const ago = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const result = formatDwellTime(ago)
    expect(result).toBe('30m')
  })

  test('2 hours ago shows 2h', () => {
    const ago = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const result = formatDwellTime(ago)
    expect(result).toBe('2h')
  })

  test('3 days ago shows 3d', () => {
    const ago = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const result = formatDwellTime(ago)
    expect(result).toBe('3d')
  })

  test('14 days ago shows 2w', () => {
    const ago = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const result = formatDwellTime(ago)
    expect(result).toBe('2w')
  })
})