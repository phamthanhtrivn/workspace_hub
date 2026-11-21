"use strict";
(globalThis["webpackChunkweb"] = globalThis["webpackChunkweb"] || []).push([["components_ui_custom_workspace-emoji-picker_tsx"],{

/***/ "./components/ui/custom/workspace-emoji-picker.tsx":
/*!*********************************************************!*\
  !*** ./components/ui/custom/workspace-emoji-picker.tsx ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ WorkspaceEmojiPicker)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/react/jsx-runtime.js");
/* harmony import */ var emoji_picker_react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! emoji-picker-react */ "./node_modules/emoji-picker-react/dist/emoji-picker-react.esm.js");
/* harmony import */ var next_themes__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next-themes */ "./node_modules/next-themes/dist/index.mjs");
/* harmony import */ var _appearance_constants__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./appearance.constants */ "./components/ui/custom/appearance.constants.ts");
"use client";




function WorkspaceEmojiPicker({ onSelect, }) {
    const { resolvedTheme } = (0,next_themes__WEBPACK_IMPORTED_MODULE_2__.useTheme)();
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(emoji_picker_react__WEBPACK_IMPORTED_MODULE_1__["default"], { onEmojiClick: (emoji) => onSelect(emoji.emoji), theme: resolvedTheme === "dark" ? emoji_picker_react__WEBPACK_IMPORTED_MODULE_1__.Theme.DARK : emoji_picker_react__WEBPACK_IMPORTED_MODULE_1__.Theme.LIGHT, emojiStyle: emoji_picker_react__WEBPACK_IMPORTED_MODULE_1__.EmojiStyle.NATIVE, width: "100%", height: "min(400px, 65dvh)", searchPlaceholder: _appearance_constants__WEBPACK_IMPORTED_MODULE_3__.APPEARANCE_COPY.searchIcons, previewConfig: { showPreview: false }, lazyLoadEmojis: true }));
}


/***/ })

}]);