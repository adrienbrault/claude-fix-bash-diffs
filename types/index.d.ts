export type IsOff = boolean

declare module 'claude-code' {
  interface PluginState {
    'fix-bash-diffs': { isOff: IsOff }
  }
}
