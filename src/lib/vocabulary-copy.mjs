const LIMITS = {
  meaning_vi: 90,
  context_topic: 48,
  example_en: 90,
  example_vi: 100,
  hook: 42,
  cta: 54,
};

const HOOKS = [
  ({ word }) => `Bạn đã dùng “${word}” đúng chưa?`,
  ({ word }) => `Gặp “${word}”, hiểu sao cho chuẩn?`,
  ({ word }) => `Một cách nhớ nhanh từ “${word}”`,
  ({ context_topic }) => context_topic ? `Nói về ${context_topic}: dùng từ nào?` : "Từ này dùng thế nào cho tự nhiên?",
];

const CTAS = [
  ({ handle }) => `Lưu lại và theo dõi ${handle} nhé.`,
  ({ handle }) => `Theo dõi ${handle} để học thêm mỗi ngày.`,
  ({ handle }) => `Bạn đặt thử một câu rồi tag ${handle} nhé.`,
  ({ handle }) => `Lưu từ này, mai học tiếp cùng ${handle}.`,
];

function clean(value) {
  return typeof value === "string" ? value.trim().normalize("NFKC").replace(/\s+/g, " ") : "";
}

function hash(value) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.codePointAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function pick(items, seed, offset = 0) {
  return items[(hash(seed) + offset) % items.length];
}

function fit(value, limit) {
  const text = clean(value);
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit + 1);
  const boundary = slice.lastIndexOf(" ");
  return `${slice.slice(0, boundary > limit * 0.65 ? boundary : limit - 1).replace(/[.,;:!?]+$/, "")}…`;
}

function sentence(value) {
  const text = clean(value);
  if (!text) return "";
  return `${text[0].toUpperCase()}${text.slice(1)}`.replace(/[.!?]*$/, ".");
}

/**
 * Deterministic fallback used when editorial/AI enrichment is unavailable.
 * It never changes approval fields and always respects renderer limits.
 */
export function buildVocabularyCopy(input) {
  const word = clean(input.word);
  if (!word) throw new Error("word is required");
  const meaning = clean(input.meaning_vi || input.meaning);
  if (!meaning) throw new Error("meaning_vi is required");
  const context = clean(input.context_topic || input.context);
  const handle = /^@[A-Za-z0-9._]{1,24}$/.test(clean(input.channel_handle))
    ? clean(input.channel_handle)
    : "@english.daily.vn";
  const seed = [word.toLocaleLowerCase("en-US"), meaning.toLocaleLowerCase("vi-VN"), context].join("\u001f");

  const output = {
    meaning_vi: fit(meaning.replace(/^[Ll]à\s+/, ""), LIMITS.meaning_vi),
    context_topic: fit(context || pick(["giao tiếp hằng ngày", "công việc", "học tập", "cảm xúc"], seed, 7), LIMITS.context_topic),
    example_en: fit(sentence(input.example_en) || `Try using “${word}” in a sentence today.`, LIMITS.example_en),
    example_vi: fit(sentence(input.example_vi) || `Hôm nay, hãy thử dùng “${word}” trong một câu.`, LIMITS.example_vi),
  };
  output.hook = fit(clean(input.hook) || pick(HOOKS, seed)({ word, ...output }), LIMITS.hook);
  output.cta = fit(clean(input.cta) || pick(CTAS, seed, 13)({ handle, word, ...output }), LIMITS.cta);
  return output;
}

export function validateVocabularyCopy(copy) {
  const errors = [];
  for (const [field, limit] of Object.entries(LIMITS)) {
    const value = clean(copy[field]);
    if (!value) errors.push(`${field} is required`);
    else if (value.length > limit) errors.push(`${field} exceeds ${limit} characters`);
  }
  if (clean(copy.example_en) && !/[.!?]$/.test(clean(copy.example_en)))
    errors.push("example_en must end with punctuation");
  if (clean(copy.example_vi) && !/[.!?]$/.test(clean(copy.example_vi)))
    errors.push("example_vi must end with punctuation");
  if (clean(copy.example_en).toLocaleLowerCase("en-US") === clean(copy.example_vi).toLocaleLowerCase("en-US"))
    errors.push("example translations must differ");
  return { ok: errors.length === 0, errors };
}

export { LIMITS as VOCABULARY_COPY_LIMITS };
