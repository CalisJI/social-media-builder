const record = value => value && typeof value === "object" && !Array.isArray(value);

export function normalizeRenderJob(input) {
  if (!record(input) || (!record(input.content) && !record(input.presentation))) return input;
  const content = record(input.content) ? input.content : input.entry;
  const presentation = record(input.presentation) ? input.presentation : {};
  return {
    ...input,
    entry: content,
    entries: record(input.content) ? undefined : input.entries,
    template_id: presentation.template_id ?? input.template_id,
    template_key: presentation.template_key ?? input.template_key,
    strategy_id: presentation.strategy_id ?? input.strategy_id,
    duration_seconds: presentation.duration_seconds ?? input.duration_seconds,
    brand_handle: presentation.brand_handle ?? input.brand_handle,
    channel_handle: presentation.channel_handle ?? input.channel_handle,
    cta: presentation.cta ?? input.cta,
  };
}
