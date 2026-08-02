const nullableId = value => typeof value === "string" && value.trim() ? value.trim() : null;

/**
 * Stable, serializable metadata stored with every completed render.
 * Template and strategy are always resolved by normalizePayload; experiment
 * and variant remain nullable so render records created by older clients are safe.
 */
export function renderResponseMetadata(payload = {}) {
  return {
    template_id: nullableId(payload.template),
    strategy_id: nullableId(payload.strategy),
    experiment_id: nullableId(payload.experimentId),
    variant_id: nullableId(payload.variantId),
  };
}

export function buildRenderManifestRecord({ payload, payloadSha256, artifactSha256 = null, filename, completedAt }) {
  return {
    // `hash` is retained for manifests written before TIKTOK-120.
    hash: payloadSha256,
    payloadSha256,
    artifactSha256,
    filename,
    completedAt,
    metadata: renderResponseMetadata(payload),
  };
}
