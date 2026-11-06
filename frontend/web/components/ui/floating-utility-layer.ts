// Above application dialogs (110), feature overlays (150), and task tooltips (220).
// Legacy z-[9999] modal contents are inside their shared DialogSurface (110).
export const FLOATING_UTILITY_LAYER_CLASS = "z-[300]";

// A persistent utility may receive focus alongside the active modal, without
// allowing focus into the rest of the page behind its backdrop.
export const MODAL_COMPANION_SELECTOR = '[data-modal-companion="floating-utility"]';
