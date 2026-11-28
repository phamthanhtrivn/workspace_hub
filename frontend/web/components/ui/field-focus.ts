/** A composed field delegates its indicator to the element that owns its border. */
export type FieldFocusMode = "self" | "container";

export const FIELD_FOCUS_CLASS_NAMES = {
  self: "field-focus",
  container: "field-focus-content",
} as const satisfies Record<FieldFocusMode, string>;

export const FIELD_FOCUS_CONTAINER_CLASS_NAME = "field-focus-container";
export const FIELD_FOCUS_GROUP_CLASS_NAME = "field-focus-group";
export const FIELD_FOCUS_OPEN_CLASS_NAME = "field-focus-open";
