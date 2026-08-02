const constrainedFields = Object.freeze([
  "brand_handle", "word", "ipa", "part_of_speech", "meaning_vi", "common_mistake", "example_en", "example_vi", "cta",
]);
const requiredConstraintFields = Object.freeze(constrainedFields.filter(field => field !== "common_mistake"));

export class ConstraintError extends Error {}

function invalid(field, detail) {
  return new ConstraintError(`${field} has invalid constraints.maxLength: ${detail}`);
}

export function resolveConstraints(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ConstraintError("constraints must be an object");
  }
  for (const field of Object.keys(value)) {
    if (!constrainedFields.includes(field)) throw new ConstraintError(`${field} is not a supported constraint field`);
  }
  const resolved = {};
  for (const [field, constraint] of Object.entries(value)) {
    if (!constraint || typeof constraint !== "object" || Array.isArray(constraint)) throw invalid(field, "must be an object");
    if (!Number.isSafeInteger(constraint.maxLength) || constraint.maxLength < 1) throw invalid(field, "must be a positive integer");
    if (Object.keys(constraint).some((key) => key !== "maxLength")) throw invalid(field, "only maxLength is supported");
    resolved[field] = Object.freeze({ maxLength: constraint.maxLength });
  }
  for (const field of requiredConstraintFields) {
    if (!resolved[field]) throw invalid(field, "a declaration is required");
  }
  return Object.freeze(resolved);
}
