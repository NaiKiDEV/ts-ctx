import { Canceled, DeadlineExceeded } from "./errors";
import { createKey, type ContextKey } from "./key";

/** Carries a cancellation signal, an optional deadline, and request-scoped values. */
export type Context = {
  readonly signal: AbortSignal;
  readonly deadline: number | undefined;
  value<T>(key: ContextKey<T>): T | undefined;
};

/** Cancels a derived context, optionally with a custom reason. */
export type CancelFunc = (reason?: unknown) => void;

const bg: Context = {
  signal: new AbortController().signal,
  deadline: undefined,
  value: () => undefined,
};

const noop = () => {};

export const context = {
  /** Sentinel error used as the default cancellation reason. */
  Canceled,

  /** Sentinel error used when a context deadline expires. */
  DeadlineExceeded,

  /** Creates a new type-safe context key. */
  createKey,

  /** Returns the root context that is never canceled. */
  background(): Context {
    return bg;
  },

  /** Returns a derived context with a new cancel function. Canceling the parent propagates to the child. */
  withCancel(parent: Context): [Context, CancelFunc] {
    const ac = new AbortController();

    if (parent.signal.aborted) {
      ac.abort(parent.signal.reason);
      return [
        { signal: ac.signal, deadline: parent.deadline, value: parent.value },
        () => {},
      ];
    }

    const onAbort = () => ac.abort(parent.signal.reason);
    parent.signal.addEventListener("abort", onAbort, { once: true });

    let done = false;
    const cancel: CancelFunc = (reason) => {
      if (done) return;
      done = true;
      parent.signal.removeEventListener("abort", onAbort);
      ac.abort(reason ?? Canceled);
    };

    return [
      { signal: ac.signal, deadline: parent.deadline, value: parent.value },
      cancel,
    ];
  },

  /** Returns a derived context that cancels after the given duration in milliseconds. */
  withTimeout(parent: Context, ms: number): [Context, CancelFunc] {
    return context.withDeadline(parent, Date.now() + ms);
  },

  /** Returns a derived context that cancels at the given deadline (epoch ms). */
  withDeadline(parent: Context, deadline: number): [Context, CancelFunc] {
    if (parent.deadline !== undefined && parent.deadline <= deadline) {
      return context.withCancel(parent);
    }

    const ac = new AbortController();
    const ms = deadline - Date.now();

    if (ms <= 0) {
      ac.abort(DeadlineExceeded);
      return [{ signal: ac.signal, deadline, value: parent.value }, noop];
    }

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      parent.signal.removeEventListener("abort", onAbort);
    };

    const onAbort = () => {
      cleanup();
      ac.abort(parent.signal.reason);
    };

    const timer = setTimeout(() => {
      cleanup();
      ac.abort(DeadlineExceeded);
    }, ms);

    // NodeJS Timeout object
    if (typeof timer === "object") {
      (timer as any).unref?.();
    }

    parent.signal.addEventListener("abort", onAbort, { once: true });

    const cancel: CancelFunc = (reason) => {
      cleanup();
      ac.abort(reason ?? Canceled);
    };

    return [{ signal: ac.signal, deadline, value: parent.value }, cancel];
  },

  /** Returns a derived context carrying the given key-value pair. */
  withValue<T>(parent: Context, key: ContextKey<T>, val: T): Context {
    return {
      signal: parent.signal,
      deadline: parent.deadline,
      value: <U>(k: ContextKey<U>): U | undefined =>
        (k as symbol) === (key as symbol)
          ? (val as unknown as U)
          : parent.value(k),
    };
  },
};
