import { expect, test } from 'claude-code/testing'

const created = (filePath: string, n: number) => ({
  filePath,
  created: true as const,
  hunks: [{ oldStart: 1, oldLines: 0, newStart: 1, newLines: n, lines: Array.from({ length: n }, (_, i) => `+line ${i + 1}`) }],
})

const bashResult = (files: ReturnType<typeof created>[]) => ({
  stdout: 'tools-ok',
  stderr: '',
  interrupted: false,
  bashEditDiff: { files, moreFiles: 0 },
})

const SURFACES = ['terminal', 'desktop'] as const

test('a long Bash diff is drawn by the mod: whole counts, eight lines and a note under each file', async ($, on) => {
  on('session.cwd', () => ({ value: '/repo' }))
  let seen: unknown
  on('ui.render', { component: 'ToolResult' }, ($, e) => {
    seen = e.props.output
    const { Text } = $.ui.resolve(e)

    return <Text>engine row</Text>
  })

  const output = bashResult([created('/repo/src/setup.py', 67), created('/repo/config.json', 14), created('/repo/scripts/deploy.sh', 43)])

  for (const surface of SURFACES) {
    const tree = JSON.stringify(
      await $.ui.render({
        surface,
        component: 'ToolResult',
        requestId: 'toolu_1',
        props: { tool_use_id: 'toolu_1', tool: 'Bash', output, isErrored: false },
      }),
    )

    expect(seen).toEqual({ stdout: 'tools-ok', stderr: '', interrupted: false })
    expect(tree).toContain('engine row')
    for (const [name, total, hidden] of [['src/setup.py', 67, 59], ['config.json', 14, 6], ['scripts/deploy.sh', 43, 35]] as const) {
      expect(tree).toContain(`"children":["${name}"]`)
      expect(tree).toContain(`["(+","${total}"," -","0",")"]`)
      expect(tree).toContain(`["… ","${hidden}"," more lines"]`)
    }
    expect(tree).toContain(JSON.stringify(`@@ -1,0 +1,8 @@\n${Array.from({ length: 8 }, (_, i) => `+line ${i + 1}`).join('\n')}`))
  }
})

test('a Bash diff short enough is left to Claude Code', async ($, on) => {
  let seen: unknown
  on('ui.render', { component: 'ToolResult' }, ($, e) => {
    seen = e.props.output
    const { Text } = $.ui.resolve(e)

    return <Text>engine row</Text>
  })

  const output = bashResult([created('/repo/a.txt', 3)])
  for (const surface of SURFACES) {
    await $.ui.render({
      surface,
      component: 'ToolResult',
      requestId: 'toolu_2',
      props: { tool_use_id: 'toolu_2', tool: 'Bash', output, isErrored: false },
    })

    expect(seen).toEqual(output)
  }
})
