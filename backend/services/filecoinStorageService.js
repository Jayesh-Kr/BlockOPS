const MIN_UPLOAD_SIZE_BYTES = 127;
const PRIVATE_KEY_REGEX = /^0x[a-fA-F0-9]{64}$/;

let synapseClientPromise = null;

function getFilecoinProvider() {
  return 'synapse';
}

function getWalletPrivateKey() {
  return String(process.env.FILECOIN_WALLET_PRIVATE_KEY || '').trim();
}

function isFilecoinStorageConfigured() {
  return PRIVATE_KEY_REGEX.test(getWalletPrivateKey());
}

function parseBooleanEnv(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function buildPieceUri(pieceCid) {
  return pieceCid ? `filecoin://piece/${pieceCid}` : null;
}

function ensureMinimumUploadSize(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error('Expected Uint8Array payload');
  }

  if (bytes.byteLength >= MIN_UPLOAD_SIZE_BYTES) {
    return bytes;
  }

  const padded = new Uint8Array(MIN_UPLOAD_SIZE_BYTES);
  padded.set(bytes);
  return padded;
}

function encodePayload(payload, options = {}) {
  const body = {
    schemaVersion: '1.0',
    payload,
    metadata: options.metadata || {},
    name: options.name || `blockops-${Date.now()}`,
    namespace: options.namespace || 'blockops-agent-audit',
    timestamp: new Date().toISOString()
  };

  const serialized = JSON.stringify(body);
  const bytes = new TextEncoder().encode(serialized);
  return ensureMinimumUploadSize(bytes);
}

async function getSynapseClient() {
  if (!synapseClientPromise) {
    synapseClientPromise = (async () => {
      const privateKey = getWalletPrivateKey();
      if (!PRIVATE_KEY_REGEX.test(privateKey)) {
        throw new Error('FILECOIN_WALLET_PRIVATE_KEY is missing or invalid (expected 0x-prefixed 32-byte hex key)');
      }

      const [{ Synapse }, { calibration }, { privateKeyToAccount }] = await Promise.all([
        import('@filoz/synapse-sdk'),
        import('@filoz/synapse-core/chains'),
        import('viem/accounts')
      ]);

      return Synapse.create({
        account: privateKeyToAccount(privateKey),
        source: String(process.env.SYNAPSE_SOURCE || 'blockops-agent-audit'),
        chain: calibration,
        withCDN: parseBooleanEnv(process.env.SYNAPSE_WITH_CDN, false)
      });
    })();
  }

  return synapseClientPromise;
}

async function archiveJsonToFilecoin(payload, options = {}) {
  if (!isFilecoinStorageConfigured()) {
    return {
      status: 'not_configured',
      provider: 'synapse',
      error: 'FILECOIN_WALLET_PRIVATE_KEY is not configured'
    };
  }

  try {
    const synapse = await getSynapseClient();
    const uploadBytes = encodePayload(payload, options);

    const preparation = await synapse.storage.prepare({
      dataSize: BigInt(uploadBytes.byteLength)
    });

    let prepareTxHash = null;
    if (preparation?.transaction) {
      const txResult = await preparation.transaction.execute();
      prepareTxHash = txResult?.hash || null;
    }

    const uploadResult = await synapse.storage.upload(uploadBytes);
    const pieceCid = uploadResult?.pieceCid || null;

    if (!pieceCid) {
      return {
        status: 'failed',
        provider: 'synapse',
        error: 'Synapse upload did not return pieceCid'
      };
    }

    return {
      status: 'stored',
      provider: 'synapse',
      pieceCid,
      // Keep cid alias for backward compatibility with current audit writer.
      cid: pieceCid,
      uri: buildPieceUri(pieceCid),
      prepareTxHash,
      complete: Boolean(uploadResult?.complete),
      copiesStored: Array.isArray(uploadResult?.copies) ? uploadResult.copies.length : 0,
      failedAttempts: Array.isArray(uploadResult?.failedAttempts) ? uploadResult.failedAttempts.length : 0,
      size: uploadResult?.size || uploadBytes.byteLength
    };
  } catch (error) {
    return {
      status: 'failed',
      provider: 'synapse',
      error: error?.message || String(error)
    };
  }
}

module.exports = {
  archiveJsonToFilecoin,
  buildPieceUri,
  getFilecoinProvider,
  isFilecoinStorageConfigured
};
