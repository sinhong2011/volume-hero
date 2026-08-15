// Makes the `bun:test` module visible to tsc for the *.test.ts files.
// WXT generates .wxt/tsconfig.json without a `types` entry, and referencing
// bun-types here keeps that generated file untouched on the next `wxt prepare`.
/// <reference types="bun-types" />
