// Auth utilities — barrel file
// Node-runtime consumers (Server Actions, Server Components) can import from here.
// middleware.ts MUST import from ./auth-edge directly to avoid Edge bundling issues with node:crypto.

export { SESSION_COOKIE_NAME, verifySessionCookieEdge } from './auth-edge'
export { signSessionCookie, verifySessionCookie } from './auth-node'
