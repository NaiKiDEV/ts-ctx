# ts-ctx

[![npm](https://img.shields.io/npm/v/@naikidev/ts-ctx)](https://www.npmjs.com/package/@naikidev/ts-ctx)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@naikidev/ts-ctx)](https://bundlephobia.com/package/@naikidev/ts-ctx)
[![license](https://img.shields.io/github/license/NaiKiDEV/ts-ctx)](./LICENSE)

Go's `context` package for TypeScript — cancellation propagation and request-scoped values, built on native `AbortSignal`.

## Why

Go's context pattern solves a real problem: carrying a cancellation signal and request metadata through an entire call chain without threading it through every function signature. TypeScript has the pieces — `AbortSignal`, `AbortController`, optional chaining — but no standard way to compose them.

ts-ctx provides that composition. Every context exposes a `.signal` property, so it works directly with `fetch`, Node.js streams, `addEventListener`, and any other API that understands `AbortSignal`.

## Install

```sh
pnpm add @naikidev/ts-ctx
```

## Quick start

```ts
import { context, type Context } from "@naikidev/ts-ctx";

const requestIdKey = context.createKey<string>("requestId");

async function fetchUser(ctx: Context, userId: string) {
  const res = await fetch(`/api/users/${userId}`, { signal: ctx.signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function handleRequest(parent: Context) {
  const [ctx, cancel] = context.withTimeout(parent, 5000);
  try {
    return await fetchUser(ctx, "user-1");
  } finally {
    cancel();
  }
}

const root = context.withValue(context.background(), requestIdKey, crypto.randomUUID());
handleRequest(root);
```

## API

All functions are available under the `context` named export.

| Function | Description |
| --- | --- |
| `context.background()` | Root context. Never cancels. |
| `context.withCancel(parent)` | Derived context with a manual cancel function. |
| `context.withTimeout(parent, ms)` | Cancels after `ms` milliseconds. |
| `context.withDeadline(parent, epoch)` | Cancels at the given epoch timestamp. |
| `context.withValue(parent, key, value)` | Attaches a type-safe value to the context chain. |
| `context.createKey<T>(description?)` | Creates a unique typed key for use with `withValue`. |
| `context.Canceled` | Sentinel error set as `signal.reason` on manual cancel. |
| `context.DeadlineExceeded` | Sentinel error set as `signal.reason` on timeout. |

### Cancellation

```ts
const [ctx, cancel] = context.withCancel(parent);

// Canceling a parent propagates to all derived contexts
cancel();                       // reason: context.Canceled
cancel(new Error("timed out")); // custom reason

ctx.signal.aborted // true
ctx.signal.reason  // context.Canceled
```

### Timeouts and deadlines

```ts
// Cancel after 5 seconds
const [ctx, cancel] = context.withTimeout(parent, 5_000);

// Cancel at a specific epoch timestamp
const [ctx, cancel] = context.withDeadline(parent, Date.now() + 5_000);

// Deadline is capped at the parent's — children can never exceed the parent budget
ctx.deadline // number | undefined (epoch ms)
```

Always call `cancel()` in a `finally` block to release the parent listener.

### Type-safe values

```ts
const userKey = context.createKey<User>("user");

const ctx = context.withValue(parent, userKey, currentUser);
ctx.value(userKey) // User | undefined
```

Values are inherited by all derived contexts and isolated to the chain they are set on.

### AbortSignal interop

```ts
// fetch
const res = await fetch(url, { signal: ctx.signal });

// addEventListener — removed automatically on cancel
window.addEventListener("resize", handler, { signal: ctx.signal });

// Node.js streams
await pipeline(readable, writable, { signal: ctx.signal });
```

## Documentation

Full documentation including guides, best practices, and API reference is available at **[naikidev.github.io/ts-ctx](https://naikidev.github.io/ts-ctx)**.

## Development

pnpm workspace monorepo.

```sh
pnpm install
```

| Script | Description |
| --- | --- |
| `pnpm build` | Build the library. |
| `pnpm test` | Run tests. |
| `pnpm test:watch` | Run tests in watch mode. |
| `pnpm docs:dev` | Start the documentation dev server. |
| `pnpm docs:build` | Build the documentation site. |

## License

[MIT](./LICENSE)
