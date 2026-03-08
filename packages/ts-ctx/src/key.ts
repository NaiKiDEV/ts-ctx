declare const brand: unique symbol

/** A type-safe key for storing and retrieving context values. */
export type ContextKey<T> = symbol & { readonly [brand]: T }

/** Creates a new type-safe context key. */
export function createKey<T>(description?: string): ContextKey<T> {
  return Symbol(description) as ContextKey<T>
}
