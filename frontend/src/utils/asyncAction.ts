// Small helper to standardize loading and error state handling
// Use simple, descriptive naming and clear flow

export async function runWithLoadingAndError<T>(
  action: () => Promise<T>,
  setState: (state: { loading: boolean; error: string | null }) => void
): Promise<T> {
  setState({ loading: true, error: null })
  try {
    const result = await action()
    setState({ loading: false, error: null })
    return result
  } catch (e: any) {
    const message = typeof e?.message === 'string' ? e.message : 'Operation failed'
    setState({ loading: false, error: message })
    throw e
  }
}
