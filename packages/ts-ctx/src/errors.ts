/** Sentinel error used as the default cancellation reason. */
export const Canceled = new Error("context canceled")

/** Sentinel error used when a context deadline expires. */
export const DeadlineExceeded = new Error("context deadline exceeded")
