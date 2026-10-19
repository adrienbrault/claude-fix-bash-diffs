import { expect, test } from 'claude-code/testing'

import { head } from './register'

test('a created file keeps its first eight lines', () => {
  const lines = Array.from({ length: 45 }, (_, i) => `+line ${i + 1}`)
  const { hunks, hidden } = head([{ oldStart: 1, oldLines: 0, newStart: 1, newLines: 45, lines }])

  expect(hidden).toBe(37)
  expect(hunks).toEqual([{ oldStart: 1, oldLines: 0, newStart: 1, newLines: 8, lines: lines.slice(0, 8) }])
})

test('the cut keeps whole hunks while they fit and drops the ones after', () => {
  const a = { oldStart: 1, oldLines: 7, newStart: 1, newLines: 7, lines: [' a', ' b', ' c', '-d', '+D', ' e', ' f', ' g'] }
  const b = { oldStart: 20, oldLines: 7, newStart: 20, newLines: 7, lines: [' t', ' u', ' v', '-w', '+W', ' x', ' y', ' z'] }
  const c = { oldStart: 40, oldLines: 1, newStart: 40, newLines: 1, lines: ['-q', '+Q'] }
  const { hunks, hidden } = head([a, b, c])

  expect(hidden).toBe(10)
  expect(hunks).toEqual([a])
})

test('a short diff is left whole', () => {
  const input = [{ oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, lines: ['-a', '+A'] }]

  expect(head(input)).toEqual({ hunks: input, hidden: 0 })
})
