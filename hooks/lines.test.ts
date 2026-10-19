import { expect, test } from 'claude-code/testing'

import { diffLines } from './register'

test('a file counts its diff lines across hunks', () => {
  const a = { oldStart: 1, oldLines: 2, newStart: 1, newLines: 2, lines: [' a', '-b', '+B'] }
  const b = { oldStart: 20, oldLines: 1, newStart: 20, newLines: 1, lines: ['-q', '+Q'] }

  expect(diffLines([a, b])).toBe(5)
})

test('a no-newline marker is not a line of the file', () => {
  const lines = ['+a', '+b', '\\ No newline at end of file']

  expect(diffLines([{ oldStart: 1, oldLines: 0, newStart: 1, newLines: 2, lines }])).toBe(2)
})
