import { expect, test } from 'claude-code/testing'

import { head } from './register'

test('a created file keeps its first ten lines', () => {
  const lines = Array.from({ length: 45 }, (_, i) => `+line ${i + 1}`)
  const { hunks, hidden } = head([{ oldStart: 1, oldLines: 0, newStart: 1, newLines: 45, lines }])

  expect(hidden).toBe(35)
  expect(hunks).toEqual([{ oldStart: 1, oldLines: 0, newStart: 1, newLines: 10, lines: lines.slice(0, 10) }])
})

test('the cut ends in a later hunk and drops the ones after it', () => {
  const a = { oldStart: 1, oldLines: 7, newStart: 1, newLines: 7, lines: [' a', ' b', ' c', '-d', '+D', ' e', ' f', ' g'] }
  const b = { oldStart: 20, oldLines: 7, newStart: 20, newLines: 7, lines: [' t', ' u', ' v', '-w', '+W', ' x', ' y', ' z'] }
  const c = { oldStart: 40, oldLines: 1, newStart: 40, newLines: 1, lines: ['-q', '+Q'] }
  const { hunks, hidden } = head([a, b, c])

  expect(hidden).toBe(8)
  expect(hunks).toEqual([a, { oldStart: 20, oldLines: 2, newStart: 20, newLines: 2, lines: [' t', ' u'] }])
})

test('a short diff is left whole', () => {
  const input = [{ oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, lines: ['-a', '+A'] }]

  expect(head(input)).toEqual({ hunks: input, hidden: 0 })
})
