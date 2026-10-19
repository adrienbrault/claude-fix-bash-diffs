export type IsOff = boolean

declare module 'claude-code' {
  interface PluginState {
    'short-diffs': { isOff: IsOff }
  }
}
