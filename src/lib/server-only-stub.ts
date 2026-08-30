// Stands in for the "server-only" package in Vitest, which has no bundler
// alias for it the way Next.js does. Every src/data/*.ts file imports the real
// package purely for its side effect (failing a client-bundle build), so an
// empty module is a correct substitute in a Node test run.
export {};
