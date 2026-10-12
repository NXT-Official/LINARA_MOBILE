// Vitest (through Vite) loads a `?raw` import as the file's text. wiring.test.ts
// reads source this way, so the React Native typecheck never needs Node's types.
declare module "*?raw" {
  const source: string;
  export default source;
}
