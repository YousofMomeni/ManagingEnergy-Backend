// This file tells TypeScript that the 'csv-parser' module exists,
// even though it doesn't have its own type definitions.
// This resolves the "Cannot find module" error.
declare module 'csv-parser';
