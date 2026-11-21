"use strict";
(globalThis["webpackChunkweb"] = globalThis["webpackChunkweb"] || []).push([["components_common_workspace-help-dialog_tsx"],{

/***/ "./components/common/workspace-help-dialog.tsx":
/*!*****************************************************!*\
  !*** ./components/common/workspace-help-dialog.tsx ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   WorkspaceHelpDialog: () => (/* binding */ WorkspaceHelpDialog)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/react/jsx-runtime.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var next_navigation__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/navigation */ "../../docs/thesis/interfaces/source/navigation.jsx");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/book-open.mjs");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/keyboard.mjs");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/wrench.mjs");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/circle-question-mark.mjs");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/search-x.mjs");
/* harmony import */ var _components_ui_dialog__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/components/ui/dialog */ "./components/ui/dialog.tsx");
/* harmony import */ var _components_ui_button__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @/components/ui/button */ "./components/ui/button.tsx");
/* harmony import */ var _components_ui_search_input__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @/components/ui/search-input */ "./components/ui/search-input.tsx");
/* harmony import */ var _components_ui_tabs__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @/components/ui/tabs */ "./components/ui/tabs.tsx");
/* harmony import */ var _features_help_components_help_article_list__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @/features/help/components/help-article-list */ "./features/help/components/help-article-list.tsx");
/* harmony import */ var _features_help_components_help_topic_navigation__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! @/features/help/components/help-topic-navigation */ "./features/help/components/help-topic-navigation.tsx");
/* harmony import */ var _features_help_components_help_search_results__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! @/features/help/components/help-search-results */ "./features/help/components/help-search-results.tsx");
/* harmony import */ var _features_help_components_help_shortcuts_panel__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! @/features/help/components/help-shortcuts-panel */ "./features/help/components/help-shortcuts-panel.tsx");
/* harmony import */ var _features_help_constants_help_guides__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! @/features/help/constants/help-guides */ "./features/help/constants/help-guides.ts");
/* harmony import */ var _features_help_constants_help_troubleshooting__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! @/features/help/constants/help-troubleshooting */ "./features/help/constants/help-troubleshooting.ts");
/* harmony import */ var _features_help_constants_help_shortcuts__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! @/features/help/constants/help-shortcuts */ "./features/help/constants/help-shortcuts.ts");
/* harmony import */ var _features_help_constants_help_topics__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! @/features/help/constants/help-topics */ "./features/help/constants/help-topics.ts");
/* harmony import */ var _features_help_utils_help_search__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! @/features/help/utils/help-search */ "./features/help/utils/help-search.ts");
/* harmony import */ var _features_user_setting_hooks_use_open_user_settings__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! @/features/user-setting/hooks/use-open-user-settings */ "./features/user-setting/hooks/use-open-user-settings.ts");
/* harmony import */ var _features_user_setting_types_settings_enums__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! @/features/user-setting/types/settings.enums */ "./features/user-setting/types/settings.enums.ts");
/* harmony import */ var _lib_utils__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! @/lib/utils */ "./lib/utils.ts");
"use client";




















const HELP_TABS = [
    { id: "guides", label: "Guides", icon: lucide_react__WEBPACK_IMPORTED_MODULE_19__["default"] },
    { id: "shortcuts", label: "Keyboard shortcuts", icon: lucide_react__WEBPACK_IMPORTED_MODULE_20__["default"] },
    { id: "troubleshooting", label: "Troubleshooting", icon: lucide_react__WEBPACK_IMPORTED_MODULE_21__["default"] },
];
function WorkspaceHelpDialog({ open, onClose, }) {
    const currentTopic = (0,_features_help_constants_help_topics__WEBPACK_IMPORTED_MODULE_14__.getHelpTopic)((0,next_navigation__WEBPACK_IMPORTED_MODULE_2__.usePathname)());
    const descriptionId = (0,react__WEBPACK_IMPORTED_MODULE_1__.useId)();
    const openSettings = (0,_features_user_setting_hooks_use_open_user_settings__WEBPACK_IMPORTED_MODULE_16__.useOpenUserSettings)();
    const [query, setQuery] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)("");
    const [topic, setTopic] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)("all");
    const [tab, setTab] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)("guides");
    const searching = query.trim().length > 0;
    const guides = (0,_features_help_utils_help_search__WEBPACK_IMPORTED_MODULE_15__.findHelpEntries)(_features_help_constants_help_guides__WEBPACK_IMPORTED_MODULE_11__.HELP_GUIDES, query, topic, currentTopic);
    const shortcuts = (0,_features_help_utils_help_search__WEBPACK_IMPORTED_MODULE_15__.findHelpEntries)(_features_help_constants_help_shortcuts__WEBPACK_IMPORTED_MODULE_13__.HELP_SHORTCUTS, query, topic, currentTopic);
    const problems = (0,_features_help_utils_help_search__WEBPACK_IMPORTED_MODULE_15__.findHelpEntries)(_features_help_constants_help_troubleshooting__WEBPACK_IMPORTED_MODULE_12__.HELP_TROUBLESHOOTING, query, topic, currentTopic);
    const total = guides.length + shortcuts.length + problems.length;
    const visibleCount = searching
        ? total
        : tab === "guides"
            ? guides.length
            : tab === "shortcuts"
                ? shortcuts.length
                : problems.length;
    const handleOpenSettings = () => {
        onClose();
        openSettings?.(_features_user_setting_types_settings_enums__WEBPACK_IMPORTED_MODULE_17__.UserSettingTab.GENERAL);
    };
    const articlesProps = {
        onNavigate: onClose,
        onOpenSettings: handleOpenSettings,
    };
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_dialog__WEBPACK_IMPORTED_MODULE_3__.Dialog, { open: open, onOpenChange: (value) => {
            if (!value)
                onClose();
        }, children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_components_ui_dialog__WEBPACK_IMPORTED_MODULE_3__.DialogContent, { "aria-describedby": descriptionId, className: "flex h-[min(760px,92dvh)] max-w-5xl flex-col", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_components_ui_dialog__WEBPACK_IMPORTED_MODULE_3__.DialogHeader, { className: "shrink-0 border-b border-border px-5 pb-5 pr-14 sm:px-6 sm:pr-14", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_components_ui_dialog__WEBPACK_IMPORTED_MODULE_3__.DialogTitle, { className: "flex items-center gap-2 text-xl", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(lucide_react__WEBPACK_IMPORTED_MODULE_22__["default"], { "aria-hidden": "true", className: "size-5 text-link" }), "Help & shortcuts"] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_dialog__WEBPACK_IMPORTED_MODULE_3__.DialogDescription, { id: descriptionId, children: "Learn your workspace. Find an answer. Get back to your work." })] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { className: "flex min-h-0 flex-1 flex-col md:flex-row", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_features_help_components_help_topic_navigation__WEBPACK_IMPORTED_MODULE_8__.HelpTopicNavigation, { topic: topic, currentTopic: currentTopic, onTopicChange: setTopic }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { className: "flex min-h-0 min-w-0 flex-1 flex-col", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { className: "shrink-0 px-5 pt-5 sm:px-6", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_search_input__WEBPACK_IMPORTED_MODULE_5__.SearchInput, { "data-modal-initial-focus": true, "aria-label": "Search help, shortcuts and troubleshooting", placeholder: "Search help, shortcuts and troubleshooting\u2026", value: query, onChange: (event) => setQuery(event.target.value), onClear: () => setQuery(""), className: "h-11" }), currentTopic && topic === "all" && !searching && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("p", { className: "mt-3 text-xs leading-5 text-muted-foreground", children: ["On ", (0,_features_help_constants_help_topics__WEBPACK_IMPORTED_MODULE_14__.getHelpTopicLabel)(currentTopic), "?", " ", (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_button__WEBPACK_IMPORTED_MODULE_4__.Button, { type: "button", variant: "link", onClick: () => setTopic(currentTopic), className: "h-auto min-h-0 p-0 text-xs font-medium", children: "Show help for this page" })] }))] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_components_ui_tabs__WEBPACK_IMPORTED_MODULE_6__.Tabs, { value: tab, onValueChange: setTab, className: "min-h-0 flex-1 gap-0", children: [!searching && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_tabs__WEBPACK_IMPORTED_MODULE_6__.TabsList, { "aria-label": "Help sections", className: "mx-5 mt-4 h-auto w-auto shrink-0 justify-start overflow-x-auto rounded-none border-b border-border bg-transparent p-0 sm:mx-6", children: HELP_TABS.map(({ id, label, icon: Icon }) => ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_components_ui_tabs__WEBPACK_IMPORTED_MODULE_6__.TabsTrigger, { value: id, unstyled: true, className: "flex min-h-11 items-center gap-2 border-b-2 border-transparent px-3 text-xs font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground sm:text-sm", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Icon, { "aria-hidden": "true", className: "hidden size-4 sm:block" }), label] }, id))) })), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { className: "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-5 sm:px-6", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("p", { role: "status", "aria-live": "polite", className: (0,_lib_utils__WEBPACK_IMPORTED_MODULE_18__.cn)("mb-4 text-xs text-muted-foreground", !searching && "sr-only"), children: [searching
                                                            ? `${total} results for “${query.trim()}”`
                                                            : `${visibleCount} entries`, topic !== "all" ? ` in ${(0,_features_help_constants_help_topics__WEBPACK_IMPORTED_MODULE_14__.getHelpTopicLabel)(topic)}` : ""] }), visibleCount === 0 && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { className: "flex flex-col items-center px-4 py-10 text-center", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(lucide_react__WEBPACK_IMPORTED_MODULE_23__["default"], { "aria-hidden": "true", className: "mb-4 size-8 text-muted-foreground" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("h3", { className: "text-base font-semibold", children: "No matching help" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", { className: "mt-2 max-w-sm text-sm leading-6 text-muted-foreground", children: "Try a task like \u201Cupload a file\u201D or \u201CAI summary\u201D, or browse all topics." }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_button__WEBPACK_IMPORTED_MODULE_4__.Button, { variant: "outline", size: "sm", className: "mt-5", onClick: () => {
                                                                setQuery("");
                                                                setTopic("all");
                                                            }, children: "Reset search and filters" })] })), searching ? ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_features_help_components_help_search_results__WEBPACK_IMPORTED_MODULE_9__.HelpSearchResults, { guides: guides, shortcuts: shortcuts, problems: problems, ...articlesProps })) : ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, { children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_components_ui_tabs__WEBPACK_IMPORTED_MODULE_6__.TabsContent, { value: "guides", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("h3", { className: "mb-1 text-base font-semibold", children: topic === "all"
                                                                        ? "What would you like to do?"
                                                                        : (0,_features_help_constants_help_topics__WEBPACK_IMPORTED_MODULE_14__.getHelpTopicLabel)(topic) }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("p", { className: "mb-5 text-sm leading-6 text-muted-foreground", children: ["Short guides for everyday work", currentTopic && topic === "all"
                                                                            ? ", with your current page first"
                                                                            : "", "."] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_features_help_components_help_article_list__WEBPACK_IMPORTED_MODULE_7__.HelpArticleList, { articles: guides, ...articlesProps })] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_tabs__WEBPACK_IMPORTED_MODULE_6__.TabsContent, { value: "shortcuts", children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_features_help_components_help_shortcuts_panel__WEBPACK_IMPORTED_MODULE_10__.HelpShortcutsPanel, { shortcuts: shortcuts }) }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_components_ui_tabs__WEBPACK_IMPORTED_MODULE_6__.TabsContent, { value: "troubleshooting", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("h3", { className: "mb-1 text-base font-semibold", children: "Get back on track" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", { className: "mb-5 text-sm leading-6 text-muted-foreground", children: "Check the cause and follow the next steps." }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_features_help_components_help_article_list__WEBPACK_IMPORTED_MODULE_7__.HelpArticleList, { articles: problems, ...articlesProps })] })] }))] })] })] })] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("footer", { className: "flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/25 px-5 py-3 text-xs text-muted-foreground sm:px-6", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", { children: "Help follows the features available in WorkspaceHub." }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("span", { className: "inline-flex items-center gap-2", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_features_help_components_help_shortcuts_panel__WEBPACK_IMPORTED_MODULE_10__.ShortcutKeys, { keys: ["?"] }), "Open help", (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", { "aria-hidden": "true", children: "\u00B7" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_features_help_components_help_shortcuts_panel__WEBPACK_IMPORTED_MODULE_10__.ShortcutKeys, { keys: ["Esc"] }), "Close"] })] })] }) }));
}


/***/ }),

/***/ "./features/help/components/help-article-list.tsx":
/*!********************************************************!*\
  !*** ./features/help/components/help-article-list.tsx ***!
  \********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HelpArticleList: () => (/* binding */ HelpArticleList)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/react/jsx-runtime.js");
/* harmony import */ var next_link__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/link */ "../../docs/thesis/interfaces/source/next-link.jsx");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/chevron-down.mjs");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/info.mjs");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/arrow-up-right.mjs");
/* harmony import */ var _components_ui_button__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/components/ui/button */ "./components/ui/button.tsx");
/* harmony import */ var _components_ui_collapsible__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/components/ui/collapsible */ "./components/ui/collapsible.tsx");
/* harmony import */ var _constants_help_topics__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../constants/help-topics */ "./features/help/constants/help-topics.ts");






function HelpArticleList({ articles, onNavigate, onOpenSettings, }) {
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", { className: "divide-y divide-border border-y border-border", children: articles.map((article) => {
            const topic = _constants_help_topics__WEBPACK_IMPORTED_MODULE_4__.HELP_TOPICS.find((entry) => entry.id === article.topic);
            const Icon = topic.icon;
            return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_components_ui_collapsible__WEBPACK_IMPORTED_MODULE_3__.Collapsible, { className: "group", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_components_ui_collapsible__WEBPACK_IMPORTED_MODULE_3__.CollapsibleTrigger, { className: "flex w-full cursor-pointer items-start gap-3 rounded-control py-4 text-left outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Icon, { "aria-hidden": "true", className: "mt-1 size-4 shrink-0 text-muted-foreground" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("span", { className: "min-w-0 flex-1", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", { className: "block text-sm font-semibold leading-6", children: article.title }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", { className: "mt-0.5 block text-xs leading-5 text-muted-foreground", children: article.description })] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(lucide_react__WEBPACK_IMPORTED_MODULE_5__["default"], { "aria-hidden": "true", className: "mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-data-[open]:rotate-180 motion-reduce:transition-none" })] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_components_ui_collapsible__WEBPACK_IMPORTED_MODULE_3__.CollapsibleContent, { className: "pb-5 pl-7 pr-1 sm:pr-7", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", { className: "mb-3 text-xs font-medium text-muted-foreground", children: (0,_constants_help_topics__WEBPACK_IMPORTED_MODULE_4__.getHelpTopicLabel)(article.topic) }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("ol", { className: "ml-4 list-decimal space-y-2 text-sm leading-6 marker:text-muted-foreground", children: article.steps.map((step) => ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("li", { className: "pl-1", children: step }, step))) }), article.note && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("p", { className: "mt-4 flex items-start gap-2 rounded-control bg-muted/60 p-3 text-xs leading-5 text-muted-foreground", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(lucide_react__WEBPACK_IMPORTED_MODULE_6__["default"], { "aria-hidden": "true", className: "mt-0.5 size-3.5 shrink-0" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", { children: article.note })] })), "href" in topic ? ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_button__WEBPACK_IMPORTED_MODULE_2__.Button, { asChild: true, variant: "link", size: "sm", className: "mt-3 h-auto px-0", children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(next_link__WEBPACK_IMPORTED_MODULE_1__["default"], { href: topic.href, onClick: onNavigate, children: ["Open ", topic.label, (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(lucide_react__WEBPACK_IMPORTED_MODULE_7__["default"], { "aria-hidden": "true", className: "size-3.5" })] }) })) : ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_components_ui_button__WEBPACK_IMPORTED_MODULE_2__.Button, { variant: "link", size: "sm", className: "mt-3 h-auto px-0", onClick: onOpenSettings, children: ["Open Settings", (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(lucide_react__WEBPACK_IMPORTED_MODULE_7__["default"], { "aria-hidden": "true", className: "size-3.5" })] }))] })] }, article.id));
        }) }));
}


/***/ }),

/***/ "./features/help/components/help-search-results.tsx":
/*!**********************************************************!*\
  !*** ./features/help/components/help-search-results.tsx ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HelpSearchResults: () => (/* binding */ HelpSearchResults)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/react/jsx-runtime.js");
/* harmony import */ var _help_article_list__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./help-article-list */ "./features/help/components/help-article-list.tsx");
/* harmony import */ var _help_shortcuts_panel__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./help-shortcuts-panel */ "./features/help/components/help-shortcuts-panel.tsx");



function HelpSearchResults({ guides, shortcuts, problems, onNavigate, onOpenSettings, }) {
    const articlesProps = { onNavigate, onOpenSettings };
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { className: "space-y-7", children: [guides.length > 0 && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("section", { "aria-label": "Matching guides", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("h3", { className: "mb-3 text-sm font-semibold", children: ["Guides", " ", (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("span", { className: "font-normal text-muted-foreground", children: ["(", guides.length, ")"] })] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_help_article_list__WEBPACK_IMPORTED_MODULE_1__.HelpArticleList, { articles: guides, ...articlesProps })] })), shortcuts.length > 0 && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("section", { "aria-label": "Matching keyboard shortcuts", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("h3", { className: "mb-3 text-sm font-semibold", children: ["Keyboard shortcuts", " ", (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("span", { className: "font-normal text-muted-foreground", children: ["(", shortcuts.length, ")"] })] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_help_shortcuts_panel__WEBPACK_IMPORTED_MODULE_2__.HelpShortcutsPanel, { shortcuts: shortcuts })] })), problems.length > 0 && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("section", { "aria-label": "Matching troubleshooting", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("h3", { className: "mb-3 text-sm font-semibold", children: ["Troubleshooting", " ", (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("span", { className: "font-normal text-muted-foreground", children: ["(", problems.length, ")"] })] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_help_article_list__WEBPACK_IMPORTED_MODULE_1__.HelpArticleList, { articles: problems, ...articlesProps })] }))] }));
}


/***/ }),

/***/ "./features/help/components/help-shortcuts-panel.tsx":
/*!***********************************************************!*\
  !*** ./features/help/components/help-shortcuts-panel.tsx ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HelpShortcutsPanel: () => (/* binding */ HelpShortcutsPanel),
/* harmony export */   ShortcutKeys: () => (/* binding */ ShortcutKeys)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/react/jsx-runtime.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _components_ui_button__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/components/ui/button */ "./components/ui/button.tsx");
/* harmony import */ var _components_ui_switch__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/components/ui/switch */ "./components/ui/switch.tsx");
/* harmony import */ var _constants_help_topics__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../constants/help-topics */ "./features/help/constants/help-topics.ts");
/* harmony import */ var _hooks_use_workspace_help__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../hooks/use-workspace-help */ "./features/help/hooks/use-workspace-help.ts");
"use client";






const subscribePlatform = () => () => { };
const getMacPlatform = () => /Mac|iPhone|iPad/.test(navigator.platform);
const serverPlatform = () => false;
function ShortcutKeys({ keys, sequential = false, }) {
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", { className: "inline-flex shrink-0 items-center gap-1 text-xs", "aria-label": keys.join(sequential ? " then " : " plus "), children: keys.map((key, index) => ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("span", { className: "inline-flex items-center gap-1", children: [index > 0 && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", { "aria-hidden": "true", className: "text-muted-foreground", children: sequential ? "then" : "+" })), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("kbd", { className: "inline-flex min-h-6 min-w-6 items-center justify-center rounded border border-input bg-background px-1.5 font-sans text-xs font-medium text-foreground shadow-sm", children: key })] }, `${key}-${index}`))) }));
}
function HelpShortcutsPanel({ shortcuts, }) {
    const { shortcutsEnabled, setShortcutsEnabled } = (0,_hooks_use_workspace_help__WEBPACK_IMPORTED_MODULE_5__.useWorkspaceHelp)();
    const detectedMac = (0,react__WEBPACK_IMPORTED_MODULE_1__.useSyncExternalStore)(subscribePlatform, getMacPlatform, serverPlatform);
    const [platform, setPlatform] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
    const isMac = platform ? platform === "mac" : detectedMac;
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { className: "space-y-5", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { className: "flex items-center justify-between gap-4 rounded-control bg-muted/60 p-4", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("label", { htmlFor: "help-app-shortcuts", className: "cursor-pointer text-sm font-semibold", children: "App shortcuts" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", { id: "help-shortcut-preference", className: "mt-1 text-xs leading-5 text-muted-foreground", children: "Saved in this browser. Help, standard navigation and editor shortcuts stay available." })] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_switch__WEBPACK_IMPORTED_MODULE_3__.Switch, { id: "help-app-shortcuts", checked: shortcutsEnabled, onCheckedChange: setShortcutsEnabled, "aria-describedby": "help-shortcut-preference" })] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", { className: "max-w-sm text-xs leading-5 text-muted-foreground", children: "App shortcuts pause in text fields and open menus or dialogs. Navigation keys are pressed in sequence." }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { role: "group", "aria-label": "Shortcut operating system", className: "flex gap-1 rounded-control bg-muted p-1", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_button__WEBPACK_IMPORTED_MODULE_2__.Button, { size: "sm", variant: !isMac ? "secondary" : "ghost", "aria-pressed": !isMac, onClick: () => setPlatform("windows"), className: "h-8 text-xs", children: "Windows / Linux" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_button__WEBPACK_IMPORTED_MODULE_2__.Button, { size: "sm", variant: isMac ? "secondary" : "ghost", "aria-pressed": isMac, onClick: () => setPlatform("mac"), className: "h-8 text-xs", children: "macOS" })] })] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("dl", { className: "divide-y divide-border border-y border-border", children: shortcuts.map((shortcut) => ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("dt", { className: "min-w-0 flex-1 basis-48", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", { className: "text-sm font-medium", children: shortcut.action }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("span", { className: "mt-0.5 block text-xs leading-5 text-muted-foreground", children: [(0,_constants_help_topics__WEBPACK_IMPORTED_MODULE_4__.getHelpTopicLabel)(shortcut.topic), !shortcutsEnabled && !shortcut.alwaysEnabled ? " · Off" : "", shortcut.note ? ` · ${shortcut.note}` : ""] })] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("dd", { children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(ShortcutKeys, { keys: isMac ? (shortcut.macKeys ?? shortcut.keys) : shortcut.keys, sequential: shortcut.id.startsWith("go-") }) })] }, shortcut.id))) })] }));
}


/***/ }),

/***/ "./features/help/components/help-topic-navigation.tsx":
/*!************************************************************!*\
  !*** ./features/help/components/help-topic-navigation.tsx ***!
  \************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HelpTopicNavigation: () => (/* binding */ HelpTopicNavigation)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/react/jsx-runtime.js");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/book-open.mjs");
/* harmony import */ var _components_ui_button__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/components/ui/button */ "./components/ui/button.tsx");
/* harmony import */ var _lib_utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/lib/utils */ "./lib/utils.ts");
/* harmony import */ var _constants_help_topics__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../constants/help-topics */ "./features/help/constants/help-topics.ts");





function HelpTopicNavigation({ topic, currentTopic, onTopicChange, }) {
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("nav", { "aria-label": "Help topics", className: "flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-muted/25 p-3 md:w-52 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_components_ui_button__WEBPACK_IMPORTED_MODULE_1__.Button, { variant: "ghost", size: "sm", "aria-pressed": topic === "all", onClick: () => onTopicChange("all"), className: (0,_lib_utils__WEBPACK_IMPORTED_MODULE_2__.cn)("shrink-0 justify-start gap-2", topic === "all" && "bg-primary-soft text-primary-soft-foreground"), children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(lucide_react__WEBPACK_IMPORTED_MODULE_4__["default"], { "aria-hidden": "true", className: "size-4" }), "All topics"] }), _constants_help_topics__WEBPACK_IMPORTED_MODULE_3__.HELP_TOPICS.map(({ id, label, icon: Icon }) => ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_components_ui_button__WEBPACK_IMPORTED_MODULE_1__.Button, { variant: "ghost", size: "sm", "aria-pressed": topic === id, "aria-label": id === currentTopic ? `${label}, current page` : label, onClick: () => onTopicChange(id), className: (0,_lib_utils__WEBPACK_IMPORTED_MODULE_2__.cn)("shrink-0 justify-start gap-2", topic === id && "bg-primary-soft text-primary-soft-foreground"), children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Icon, { "aria-hidden": "true", className: "size-4" }), label, id === currentTopic && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", { "aria-hidden": "true", className: "ml-auto size-1.5 rounded-full bg-link" }))] }, id)))] }));
}


/***/ }),

/***/ "./features/help/constants/help-guides.ts":
/*!************************************************!*\
  !*** ./features/help/constants/help-guides.ts ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HELP_GUIDES: () => (/* binding */ HELP_GUIDES)
/* harmony export */ });
const HELP_GUIDES = [
    {
        id: "plan-today",
        topic: "dashboard",
        title: "Find your next task",
        keywords: "getting started home today overdue deadline",
        description: "Start with today's schedule, outstanding tasks and upcoming meetings.",
        steps: [
            "Open Dashboard to review your timeline and task lists.",
            "Open a task to check its source, due date and available actions.",
            "Use Calendar to plan time, or Pomodoro to focus on an eligible task.",
        ],
        note: "Personal tasks and assigned project tasks keep their original context and permissions.",
    },
    {
        id: "work-assistant",
        topic: "dashboard",
        relatedTopics: ["calendar", "projects"],
        title: "Ask AI about your work",
        keywords: "assistant planning priority schedule history chat retry",
        description: "Use AI Assistant on Dashboard, Calendar or Projects to understand tasks and schedules.",
        steps: [
            "Select AI Assistant in the bottom-right corner of a supported page.",
            "Ask a specific question, such as which tasks are due soon or when you have time to focus.",
            "Check the answer against the linked work. Use conversation history to return to an earlier discussion.",
        ],
        note: "Opening the panel does not generate an answer. Availability depends on your settings, permissions and the configured AI service. Failed requests require an explicit retry.",
    },
    {
        id: "project-tasks",
        topic: "projects",
        title: "Plan and track a project",
        keywords: "board list gantt kanban assignee priority deadline members invite",
        description: "Turn shared work into tasks with owners, deadlines and supporting context.",
        steps: [
            "Open or create a project, then add a task.",
            "Set its assignee, dates, status and priority. Add a description or checklist where needed.",
            "Switch between the project's available views to review the board, list or schedule.",
            "Open Members to manage collaboration when your project role allows it.",
        ],
        note: "Available actions depend on your project role. A task's details remain connected across views.",
    },
    {
        id: "project-files",
        topic: "projects",
        title: "Add files to a project task",
        keywords: "attachment upload my files copy documents",
        description: "Choose between uploading a file, copying a personal document and attaching a project file.",
        steps: [
            "Open the task's documents section.",
            "Choose Upload for a local file, My Files for an accessible personal/shared document, or Project for a file already in this project.",
            "Select the files and confirm. Imported personal documents become independent files in Project Documents.",
        ],
        note: "Removing a task attachment does not delete the project file. Deleting that project file can make its task attachments unavailable.",
    },
    {
        id: "calendar-plan",
        topic: "calendar",
        title: "Schedule personal and team work",
        keywords: "event task attendees invite reminder timezone",
        description: "Review commitments and project tasks together while keeping their source clear.",
        steps: [
            "Open Calendar and choose a day, week, month or agenda view.",
            "Create an event or personal task, then set its dates and reminders.",
            "For events, add attendees when you want to invite others. Open a project task to edit it within your permissions.",
        ],
        note: "Calendar uses your account timezone. Open event details to confirm a date or meeting time before changing it.",
    },
    {
        id: "calendar-repeat",
        topic: "calendar",
        title: "Edit or delete a recurring event",
        keywords: "repeat series occurrence following recurrence",
        description: "Choose how much of the series your change should affect.",
        steps: [
            "Open the occurrence you want to change.",
            "Choose Edit or Delete and read the recurrence options.",
            "Select the intended scope, such as this occurrence or the series, before confirming.",
        ],
        note: "Deleting a single occurrence and deleting a series have different effects. Review the confirmation before continuing.",
    },
    {
        id: "focus-session",
        topic: "pomodoro",
        title: "Start a focus session",
        keywords: "timer break audio ambient history study productivity",
        description: "Give one task your attention and keep a record of your focus time.",
        steps: [
            "Open Pomodoro and select a task from the Calendar tasks or Project tasks panel, or choose Free focus.",
            "Review Timer settings, then start the centered timer. You can add ambient audio with Focus sounds.",
            "Use the floating timer while working elsewhere in the workspace. Use Stop & save before changing the selected task.",
            "Return to History & reports to filter a date range and review Session history or Daily stats.",
        ],
        note: "A focus session records time; it does not automatically complete the linked task.",
    },
    {
        id: "chat-conversation",
        topic: "messages",
        title: "Keep a conversation organized",
        keywords: "space channel direct message dm thread reaction poll note",
        description: "Use channels for a topic, direct messages for a person and threads for follow-ups.",
        steps: [
            "Open Messages and select a Space channel or direct conversation.",
            "Send a message, share an attachment, or use the composer's available note and poll actions.",
            "Reply in a thread to keep related follow-ups together.",
            "Mention a person to draw their attention. In a default channel, @All addresses the Space; other channels use @Channel.",
        ],
        note: "Group mentions notify eligible members and exclude the sender. Private channels and conversations keep their access boundaries.",
    },
    {
        id: "chat-ai",
        topic: "messages",
        title: "Ask AI Bot or summarize an attachment",
        keywords: "assistant document summary generate again english vietnamese",
        description: "Ask a question in the conversation or work with a specific attached document.",
        steps: [
            "Send a new message containing @AI Bot and your question in a channel, direct conversation or thread.",
            "For an attachment, choose Summarize with AI from its available actions.",
            "Open the document summary when it is ready. Use Generate again only when you want a fresh generation.",
        ],
        note: "Mentions inside code or quotes do not activate the bot. Editing an old message to add a mention does not start a request. Ordinary bot questions can use recent messages from that conversation or thread; attachment summaries focus on the selected file.",
    },
    {
        id: "meeting-join",
        topic: "meetings",
        title: "Schedule or join a meeting",
        keywords: "video call microphone camera screen share link devices",
        description: "Check your devices, meet with your team and share the context on screen.",
        steps: [
            "Open Meetings to schedule a meeting or join one you can access.",
            "Check your microphone and camera in the device preview, then join.",
            "Use the meeting controls for audio, video, screen sharing, participants and chat.",
        ],
        note: "Your browser may ask for microphone, camera or screen-sharing permission. Admission and meeting actions depend on the host's settings and your role.",
    },
    {
        id: "meeting-recording",
        topic: "meetings",
        title: "Review a recording and its AI summary",
        keywords: "transcript speech action items decisions replay",
        description: "Return to a recording and generate a summary when that feature is available.",
        steps: [
            "Open a recording you have permission to view.",
            "If you own the recording and AI summaries are available, select Summarize with AI.",
            "Wait for processing, then review the summary and verify decisions against the recording.",
        ],
        note: "People with recording access can read its saved summary. AI summarizes transcribed speech; it does not identify speakers from mixed audio. Processing depends on recording and AI service availability.",
    },
    {
        id: "documents-organize",
        topic: "documents",
        title: "Organize and find your documents",
        keywords: "upload folder version search download starred trash restore",
        description: "Keep personal files, shared documents and project files easy to find.",
        steps: [
            "Open Documents and select My files, Shared, Starred or Trash as appropriate.",
            "Browse folders or search by name. Use the view and sort controls to scan results.",
            "Open a file for its preview, versions and available actions. Use New in My files to upload or create a folder.",
        ],
        note: "The usual Documents policy is 10 MiB per file and 5 GiB per account. A shared file's available actions follow your granted access.",
    },
    {
        id: "documents-copy",
        topic: "documents",
        relatedTopics: ["messages", "meetings", "projects", "ai"],
        title: "Share access or send a file copy",
        keywords: "permissions public link chat meeting project snapshot zip folder attachment",
        description: "Choose the right way to share a document for the destination.",
        steps: [
            "Use document sharing to grant access or manage a public link when permitted.",
            "Choose Send a copy to send an independent file to a channel, direct conversation, joined live meeting chat or writable project.",
            "Select a destination, optionally add an introduction or project task, and confirm.",
        ],
        note: "Copies keep the accepted file version even if the original changes or is deleted. Original access grants and public links do not follow a copy. Folders can be exported as ZIP attachments to chat; Projects and Notebooks accept individual files.",
    },
    {
        id: "notebook-start",
        topic: "ai",
        title: "Research with Notebook AI",
        keywords: "getting started source upload drag drop pdf docx txt markdown image citation research summary",
        description: "Ask questions grounded in the sources you add to a personal notebook.",
        steps: [
            "Open Notebook AI and create or open a notebook.",
            "Add sources by dragging files into the upload area or selecting accessible files from Documents.",
            "Wait for sources to finish indexing, then select the ones to include in your question.",
            "Ask a focused question and open citations to inspect the supporting source material.",
        ],
        note: "Each notebook supports up to 5 sources, 20 MiB per file and 50 MiB total. PDF, DOCX, TXT, Markdown and supported image files are accepted. Notebook sources are private copies, independent of their originals.",
    },
    {
        id: "notebook-notes",
        topic: "ai",
        title: "Save research notes",
        keywords: "studio markdown editor summary answer",
        description: "Keep useful findings alongside your notebook's sources and conversation.",
        steps: [
            "Open the notebook's Studio or notes panel.",
            "Create a note and give it a clear title.",
            "Write and format the content with the Markdown editor, then save it.",
        ],
        note: "On smaller screens, switch between Sources, Chat and Studio. Review cited material before relying on an AI answer.",
    },
    {
        id: "account-preferences",
        topic: "account",
        title: "Adjust your workspace preferences",
        keywords: "profile avatar password security theme dark light timezone notification settings ai",
        description: "Use Settings to manage your profile and available workspace preferences.",
        steps: [
            "Open your user menu and select Settings, or use the Settings button in workspace navigation.",
            "Choose the relevant section for your profile, appearance, notifications, password, signed-in sessions or Pomodoro settings.",
            "Review and save changes where the section requires it. Sign out is at the bottom of the Settings sidebar when you want to leave the account.",
        ],
        note: "The app shortcut switch in Help is saved in this browser. It does not change standard typing, editor formatting or your operating system's shortcuts.",
    },
    {
        id: "notifications",
        topic: "account",
        title: "Return to work from a notification",
        keywords: "bell unread mention invitation alert badge",
        description: "Find invitations, mentions and updates without searching through every module.",
        steps: [
            "Open the notification bell in the workspace header.",
            "Select a notification to open its related task, conversation, invitation or event.",
            "If the destination is unavailable, check whether the content still exists and whether you still have access.",
        ],
        note: "A notification does not grant permission to its destination. Some updates depend on your notification settings.",
    },
];


/***/ }),

/***/ "./features/help/constants/help-troubleshooting.ts":
/*!*********************************************************!*\
  !*** ./features/help/constants/help-troubleshooting.ts ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HELP_TROUBLESHOOTING: () => (/* binding */ HELP_TROUBLESHOOTING)
/* harmony export */ });
const HELP_TROUBLESHOOTING = [
    {
        id: "loading-failed",
        topic: "dashboard",
        relatedTopics: [
            "projects",
            "calendar",
            "pomodoro",
            "messages",
            "meetings",
            "documents",
            "ai",
            "account",
        ],
        title: "A page or list will not load",
        keywords: "network offline retry connection error empty",
        description: "A loading error and an empty result mean different things.",
        steps: [
            "Check your internet connection and use the affected section's Retry action.",
            "If results are empty, clear search and filters before retrying.",
            "If an access error appears, confirm that you are signed in to the intended account and still belong to the project or Space.",
        ],
        note: "Reloading the page may discard unsaved form content. Copy an unsaved draft before reloading.",
    },
    {
        id: "missing-action",
        topic: "projects",
        relatedTopics: ["messages", "documents", "meetings"],
        title: "An action is missing or disabled",
        keywords: "permission role viewer editor owner member invitation access denied",
        description: "Actions reflect your role and the current state of the content.",
        steps: [
            "Read any explanation beside the action or in its tooltip.",
            "Check that your project or Space invitation has been accepted.",
            "Ask the owner or administrator to confirm your role if you need additional access.",
        ],
    },
    {
        id: "ai-unavailable",
        topic: "ai",
        relatedTopics: [
            "dashboard",
            "projects",
            "calendar",
            "messages",
            "meetings",
        ],
        title: "AI is unavailable or a response stopped",
        keywords: "assistant bot summary quota failed network retry generation service",
        description: "Check the displayed status before sending another request.",
        steps: [
            "Read the availability or quota message. If AI is disabled for your account or workspace, ask the administrator to confirm availability.",
            "For Work Assistant, use Retry or reopen the panel after service recovery; failed reads do not retry automatically.",
            "If a generation is still running, wait for its status to resolve. Use the offered retry action after a confirmed failure.",
            "For Notebook AI, confirm that sources are ready before asking again.",
        ],
        note: "A retry may recover an already saved answer. Generate again explicitly requests a new attachment summary. AI features require configured services and the relevant access.",
    },
    {
        id: "source-failed",
        topic: "ai",
        title: "A notebook source cannot be added",
        keywords: "upload size format indexing pdf scanned image limit storage drag drop",
        description: "Check the file and notebook limits, then review the source's failure message.",
        steps: [
            "Use a supported, non-empty file: PDF, DOCX, TXT, MD, PNG, JPEG or WebP.",
            "Keep within 5 sources, 20 MiB per file and 50 MiB total per notebook.",
            "PDFs support up to 100 pages. A file can contain up to 100,000 tokens and 24 scanned pages or images requiring image analysis.",
            "Remove an unused source or split an oversized document, then try adding the file again.",
        ],
    },
    {
        id: "copy-failed",
        topic: "documents",
        title: "A file copy or chat send failed",
        keywords: "attachment upload retry duplicate zip download size",
        description: "Check access, destination permissions and the file size before retrying.",
        steps: [
            "Confirm that you can download the original and still have permission to send to the destination.",
            "Chat and Project files use a 10 MiB file limit. A folder's finished ZIP must also fit the chat limit.",
            "Use Retry in the same flow when offered. Confirmed deliveries are reused to avoid duplicate sends.",
        ],
        note: "Expired preparations require a fresh attempt. Existing accepted copies follow destination access rather than the original file's access.",
    },
    {
        id: "meeting-devices",
        topic: "meetings",
        title: "Microphone, camera or screen sharing is not working",
        keywords: "video audio sound permission devices browser call",
        description: "Check browser permissions and your selected devices.",
        steps: [
            "Confirm the microphone or camera is enabled in the meeting controls.",
            "Check this site's device permissions in your browser and select the correct device.",
            "Close other apps using the device. For screen sharing, select a screen, window or tab in the browser's picker.",
        ],
        note: "Meeting admission and recording controls also depend on the host and your role.",
    },
    {
        id: "calendar-time",
        topic: "calendar",
        title: "An event appears at the wrong time",
        keywords: "timezone daylight recurring date schedule invitation",
        description: "Review your timezone and the event's recurrence before changing the schedule.",
        steps: [
            "Compare the event's displayed time with your account timezone. Refresh Calendar after any account timezone change.",
            "Open the event details to confirm its dates and recurrence.",
            "When editing a recurring event, choose the intended occurrence or series scope.",
        ],
    },
    {
        id: "shortcut-not-working",
        topic: "account",
        title: "A keyboard shortcut does not respond",
        keywords: "keyboard disabled typing input mac windows browser help navigation",
        description: "App shortcuts pause while you type, compose text or use an overlay.",
        steps: [
            "Click outside text fields and close open menus or dialogs.",
            "Open Keyboard shortcuts in Help and check that App shortcuts is enabled.",
            "Use page-specific shortcuts on their matching page. Press G, then a destination key within one second to navigate.",
            "Use the Windows / Linux or macOS display for the correct modifier keys.",
        ],
        note: "The ? Help shortcut remains available when app shortcuts are off. Browser extensions or operating system shortcuts can take priority.",
    },
];


/***/ }),

/***/ "./features/help/utils/help-search.ts":
/*!********************************************!*\
  !*** ./features/help/utils/help-search.ts ***!
  \********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   findHelpEntries: () => (/* binding */ findHelpEntries),
/* harmony export */   matchesHelpSearch: () => (/* binding */ matchesHelpSearch)
/* harmony export */ });
/* harmony import */ var _constants_help_topics__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../constants/help-topics */ "./features/help/constants/help-topics.ts");

function normalize(text) {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}
function matchesHelpSearch(entry, query) {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    const content = "title" in entry
        ? [
            entry.title,
            entry.description,
            ...entry.steps,
            entry.note,
            entry.keywords,
        ]
        : [entry.action, ...entry.keys, ...(entry.macKeys ?? []), entry.note];
    const haystack = normalize([(0,_constants_help_topics__WEBPACK_IMPORTED_MODULE_0__.getHelpTopicLabel)(entry.topic), ...content].join(" "));
    return words.every((word) => haystack.includes(word));
}
function findHelpEntries(entries, query, topic, currentTopic) {
    return entries
        .filter((entry) => (topic === "all" ||
        entry.topic === topic ||
        entry.relatedTopics?.includes(topic) ||
        entry.topic === "global") &&
        matchesHelpSearch(entry, query))
        .sort((left, right) => Number(right.topic === currentTopic) -
        Number(left.topic === currentTopic));
}


/***/ }),

/***/ "./node_modules/lucide-react/dist/esm/icons/keyboard.mjs":
/*!***************************************************************!*\
  !*** ./node_modules/lucide-react/dist/esm/icons/keyboard.mjs ***!
  \***************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   __iconNode: () => (/* binding */ __iconNode),
/* harmony export */   "default": () => (/* binding */ Keyboard)
/* harmony export */ });
/* harmony import */ var _createLucideIcon_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../createLucideIcon.mjs */ "./node_modules/lucide-react/dist/esm/createLucideIcon.mjs");
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const __iconNode = [
  ["path", { d: "M10 8h.01", key: "1r9ogq" }],
  ["path", { d: "M12 12h.01", key: "1mp3jc" }],
  ["path", { d: "M14 8h.01", key: "1primd" }],
  ["path", { d: "M16 12h.01", key: "1l6xoz" }],
  ["path", { d: "M18 8h.01", key: "emo2bl" }],
  ["path", { d: "M6 8h.01", key: "x9i8wu" }],
  ["path", { d: "M7 16h10", key: "wp8him" }],
  ["path", { d: "M8 12h.01", key: "czm47f" }],
  ["rect", { width: "20", height: "16", x: "2", y: "4", rx: "2", key: "18n3k1" }]
];
const Keyboard = (0,_createLucideIcon_mjs__WEBPACK_IMPORTED_MODULE_0__["default"])("keyboard", __iconNode);


//# sourceMappingURL=keyboard.mjs.map


/***/ }),

/***/ "./node_modules/lucide-react/dist/esm/icons/wrench.mjs":
/*!*************************************************************!*\
  !*** ./node_modules/lucide-react/dist/esm/icons/wrench.mjs ***!
  \*************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   __iconNode: () => (/* binding */ __iconNode),
/* harmony export */   "default": () => (/* binding */ Wrench)
/* harmony export */ });
/* harmony import */ var _createLucideIcon_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../createLucideIcon.mjs */ "./node_modules/lucide-react/dist/esm/createLucideIcon.mjs");
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const __iconNode = [
  [
    "path",
    {
      d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",
      key: "1ngwbx"
    }
  ]
];
const Wrench = (0,_createLucideIcon_mjs__WEBPACK_IMPORTED_MODULE_0__["default"])("wrench", __iconNode);


//# sourceMappingURL=wrench.mjs.map


/***/ })

}]);