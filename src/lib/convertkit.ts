export async function subscribeToConvertKit(
  email: string,
  tags?: string[],
): Promise<{ success: true } | { success: false; error: string }> {
  const apiKey = process.env.CONVERTKIT_API_KEY
  const formId = process.env.CONVERTKIT_FORM_ID

  if (!apiKey || !formId) {
    console.error('[convertkit] Missing CONVERTKIT_API_KEY or CONVERTKIT_FORM_ID')
    return { success: false, error: 'ConvertKit not configured' }
  }

  try {
    const body: Record<string, unknown> = { email_address: email }
    if (tags && tags.length > 0) {
      body.tags = tags
    }

    const res = await fetch(`https://api.kit.com/v4/forms/${formId}/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Kit-Api-Key': apiKey,
      },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      return { success: true }
    }

    const text = await res.text()
    console.error(`[convertkit] Subscribe failed: ${res.status} ${res.statusText}`, text)
    return { success: false, error: `API error ${res.status}` }
  } catch (err) {
    console.error('[convertkit] Network error:', err instanceof Error ? err.message : String(err))
    return { success: false, error: 'Network error' }
  }
}
