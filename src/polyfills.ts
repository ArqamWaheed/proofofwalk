import { Buffer } from "buffer";

// Must run before any @solana/web3.js import touches Buffer at module scope.
globalThis.Buffer ??= Buffer;
