import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { context } from "../src"

describe("background", () => {
  it("returns a context with a non-aborted signal", () => {
    const ctx = context.background()
    expect(ctx.signal.aborted).toBe(false)
    expect(ctx.deadline).toBeUndefined()
  })

  it("returns the same instance", () => {
    expect(context.background()).toBe(context.background())
  })

  it("value always returns undefined", () => {
    const key = context.createKey<string>("test")
    expect(context.background().value(key)).toBeUndefined()
  })
})

describe("withCancel", () => {
  it("creates a cancelable child context", () => {
    const [ctx, cancel] = context.withCancel(context.background())
    expect(ctx.signal.aborted).toBe(false)
    cancel()
    expect(ctx.signal.aborted).toBe(true)
    expect(ctx.signal.reason).toBe(context.Canceled)
  })

  it("does not cancel parent when child is canceled", () => {
    const parent = context.background()
    const [, cancel] = context.withCancel(parent)
    cancel()
    expect(parent.signal.aborted).toBe(false)
  })

  it("propagates parent cancellation to child", () => {
    const [parent, cancelParent] = context.withCancel(context.background())
    const [child] = context.withCancel(parent)
    cancelParent()
    expect(child.signal.aborted).toBe(true)
    expect(child.signal.reason).toBe(context.Canceled)
  })

  it("accepts a custom cancel reason", () => {
    const reason = new Error("custom")
    const [ctx, cancel] = context.withCancel(context.background())
    cancel(reason)
    expect(ctx.signal.reason).toBe(reason)
  })

  it("is idempotent", () => {
    const [ctx, cancel] = context.withCancel(context.background())
    cancel()
    cancel()
    expect(ctx.signal.aborted).toBe(true)
  })

  it("handles already-aborted parent", () => {
    const [parent, cancelParent] = context.withCancel(context.background())
    cancelParent()
    const [child] = context.withCancel(parent)
    expect(child.signal.aborted).toBe(true)
  })
})

describe("withTimeout", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("cancels after the specified duration", () => {
    const [ctx] = context.withTimeout(context.background(), 1000)
    expect(ctx.signal.aborted).toBe(false)
    vi.advanceTimersByTime(1000)
    expect(ctx.signal.aborted).toBe(true)
    expect(ctx.signal.reason).toBe(context.DeadlineExceeded)
  })

  it("sets the deadline", () => {
    const now = Date.now()
    const [ctx] = context.withTimeout(context.background(), 5000)
    expect(ctx.deadline).toBe(now + 5000)
  })

  it("can be canceled before timeout", () => {
    const [ctx, cancel] = context.withTimeout(context.background(), 10000)
    cancel()
    expect(ctx.signal.aborted).toBe(true)
    expect(ctx.signal.reason).toBe(context.Canceled)
  })
})

describe("withDeadline", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("cancels at the specified deadline", () => {
    const [ctx] = context.withDeadline(context.background(), Date.now() + 500)
    expect(ctx.signal.aborted).toBe(false)
    vi.advanceTimersByTime(500)
    expect(ctx.signal.aborted).toBe(true)
    expect(ctx.signal.reason).toBe(context.DeadlineExceeded)
  })

  it("immediately cancels if deadline is in the past", () => {
    const [ctx] = context.withDeadline(context.background(), Date.now() - 100)
    expect(ctx.signal.aborted).toBe(true)
    expect(ctx.signal.reason).toBe(context.DeadlineExceeded)
  })

  it("inherits earlier parent deadline", () => {
    const parentDeadline = Date.now() + 100
    const [parent] = context.withDeadline(context.background(), parentDeadline)
    const [child] = context.withDeadline(parent, Date.now() + 10000)
    expect(child.deadline).toBe(parent.deadline)
  })

  it("propagates parent cancellation", () => {
    const [parent, cancelParent] = context.withCancel(context.background())
    const [child] = context.withDeadline(parent, Date.now() + 10000)
    cancelParent()
    expect(child.signal.aborted).toBe(true)
    expect(child.signal.reason).toBe(context.Canceled)
  })
})

describe("withValue", () => {
  it("stores and retrieves a value", () => {
    const key = context.createKey<string>("name")
    const ctx = context.withValue(context.background(), key, "alice")
    expect(ctx.value(key)).toBe("alice")
  })

  it("inherits parent values", () => {
    const k1 = context.createKey<string>("k1")
    const k2 = context.createKey<number>("k2")
    const ctx1 = context.withValue(context.background(), k1, "hello")
    const ctx2 = context.withValue(ctx1, k2, 42)
    expect(ctx2.value(k1)).toBe("hello")
    expect(ctx2.value(k2)).toBe(42)
  })

  it("shadows parent value with same key", () => {
    const key = context.createKey<string>("name")
    const parent = context.withValue(context.background(), key, "alice")
    const child = context.withValue(parent, key, "bob")
    expect(child.value(key)).toBe("bob")
    expect(parent.value(key)).toBe("alice")
  })

  it("returns undefined for unknown keys", () => {
    const key = context.createKey<string>("missing")
    expect(context.background().value(key)).toBeUndefined()
  })

  it("shares signal with parent", () => {
    const [parent, cancel] = context.withCancel(context.background())
    const key = context.createKey<string>("test")
    const child = context.withValue(parent, key, "val")
    expect(child.signal).toBe(parent.signal)
    cancel()
    expect(child.signal.aborted).toBe(true)
  })
})
