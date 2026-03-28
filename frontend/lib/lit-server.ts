import { randomUUID } from "crypto"

interface LitActionRequest {
  code: string
  jsParams?: Record<string, unknown>
}

interface LitActionResponse {
  has_error?: boolean
  logs?: string
  response?: unknown
}

const DEFAULT_LIT_API_BASE_URL = "https://api.dev.litprotocol.com/core/v1"

const ENCRYPT_ACTION_CODE = `
async function main({ pkpId, secret }) {
  const ciphertext = await Lit.Actions.Encrypt({ pkpId, message: secret });
  return { ciphertext };
}
`

const DECRYPT_ACTION_CODE = `
async function main({ pkpId, ciphertext }) {
  const plaintext = await Lit.Actions.Decrypt({ pkpId, ciphertext });
  return { plaintext };
}
`

function getLitConfig() {
  const apiBaseUrl = (process.env.LIT_API_BASE_URL || DEFAULT_LIT_API_BASE_URL).replace(/\/$/, "")
  const apiKey = process.env.LIT_USAGE_API_KEY
  const defaultPkpId = process.env.LIT_PKP_ID

  if (!apiKey) {
    throw new Error("Lit is not configured: missing LIT_USAGE_API_KEY")
  }

  if (!defaultPkpId) {
    throw new Error("Lit is not configured: missing LIT_PKP_ID")
  }

  return { apiBaseUrl, apiKey, defaultPkpId }
}

function parseLitResponsePayload(payload: unknown): Record<string, unknown> {
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload)
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>
      }
      return { value: parsed }
    } catch {
      return { value: payload }
    }
  }

  if (payload && typeof payload === "object") {
    return payload as Record<string, unknown>
  }

  return { value: payload }
}

async function runLitAction<T extends Record<string, unknown>>({
  code,
  jsParams,
}: LitActionRequest): Promise<T> {
  const { apiBaseUrl, apiKey } = getLitConfig()
  const requestId = randomUUID()

  const response = await fetch(`${apiBaseUrl}/lit_action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
      "X-Request-Id": requestId,
    },
    body: JSON.stringify({
      code,
      js_params: jsParams || {},
    }),
  })

  let body: LitActionResponse | string
  try {
    body = await response.json()
  } catch {
    body = await response.text()
  }

  if (!response.ok) {
    const message = typeof body === "string" ? body : body?.logs || JSON.stringify(body)
    throw new Error(`Lit action request failed (${response.status}): ${message}`)
  }

  if (typeof body !== "object" || body === null) {
    throw new Error("Lit action returned an invalid response")
  }

  if (body.has_error) {
    throw new Error(body.logs || "Lit action execution failed")
  }

  return parseLitResponsePayload(body.response) as T
}

export async function encryptSecretWithLit(secret: string, pkpId?: string) {
  const { defaultPkpId } = getLitConfig()
  const finalPkpId = pkpId || defaultPkpId

  const data = await runLitAction<{ ciphertext?: string }>({
    code: ENCRYPT_ACTION_CODE,
    jsParams: {
      pkpId: finalPkpId,
      secret,
    },
  })

  const ciphertext = typeof data.ciphertext === "string" ? data.ciphertext : null
  if (!ciphertext) {
    throw new Error("Lit encryption did not return ciphertext")
  }

  return {
    pkpId: finalPkpId,
    ciphertext,
  }
}

export async function decryptSecretWithLit(ciphertext: string, pkpId?: string) {
  const { defaultPkpId } = getLitConfig()
  const finalPkpId = pkpId || defaultPkpId

  const data = await runLitAction<{ plaintext?: string }>({
    code: DECRYPT_ACTION_CODE,
    jsParams: {
      pkpId: finalPkpId,
      ciphertext,
    },
  })

  const plaintext = typeof data.plaintext === "string" ? data.plaintext : null
  if (!plaintext) {
    throw new Error("Lit decryption did not return plaintext")
  }

  return {
    pkpId: finalPkpId,
    plaintext,
  }
}
