"use strict";
(globalThis["webpackChunkweb"] = globalThis["webpackChunkweb"] || []).push([["features_work-assistant_components_work-assistant-panel_tsx"],{

/***/ "../../docs/thesis/interfaces/source/work-state.jsx":
/*!**********************************************************!*\
  !*** ../../docs/thesis/interfaces/source/work-state.jsx ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   useWorkAssistant: () => (/* binding */ useWorkAssistant),
/* harmony export */   workError: () => (/* binding */ workError)
/* harmony export */ });
/* harmony import */ var _fixtures__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./fixtures */ "../../docs/thesis/interfaces/source/fixtures.js");

const noop = async () => { };
const query = { isSuccess: true, isPending: false, isFetching: false, isError: false, hasNextPage: false, isFetchingNextPage: false, error: null, refetch: noop, fetchNextPage: noop, data: { pages: [] } };
const references = _fixtures__WEBPACK_IMPORTED_MODULE_0__.tasks.slice(0, 3).map(task => ({ id: task.id, kind: 'project', projectId: _fixtures__WEBPACK_IMPORTED_MODULE_0__.ids.project, title: task.title, url: '/projects/' + _fixtures__WEBPACK_IMPORTED_MODULE_0__.ids.project + '?taskId=' + task.id, dueAt: task.dueDate }));
const messages = [{ id: 'work-question', role: 'user', content: 'What should I focus on today? Consider my assigned tasks and calendar.', sources: [], created_at: _fixtures__WEBPACK_IMPORTED_MODULE_0__.timestamp }, { id: 'work-answer', role: 'assistant', content: 'Your first priority is **Implement document access controls**. It has high priority and is due on November 24.\n\n### Suggested plan\n\n1. Finish the shared-link expiry checks.\n2. Review the permission error messages.\n3. Prepare a short update for the sprint review.\n\nYou have a **Sprint review at 2:00 PM**. A 25-minute focus session before the meeting would fit your current schedule.\n\nThe calendar integration task is the next item to review with Daniel.', sources: references, created_at: _fixtures__WEBPACK_IMPORTED_MODULE_0__.timestamp, context: { scope: { audience: 'mine' }, fetchedAt: _fixtures__WEBPACK_IMPORTED_MODULE_0__.timestamp, timeZone: 'Asia/Ho_Chi_Minh', days: 7 } }];
function useWorkAssistant() { return { messages, pending: null, reply: null, status: '', notice: '', streaming: false, error: '', history: query, conversations: query, createConversation: { isPending: false, isError: false }, send: noop, stop: noop, retry: noop }; }
function workError(error) { return error?.message || ''; }


/***/ }),

/***/ "./features/work-assistant/components/work-assistant-composer.tsx":
/*!************************************************************************!*\
  !*** ./features/work-assistant/components/work-assistant-composer.tsx ***!
  \************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ WorkAssistantComposer)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/react/jsx-runtime.js");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/rotate-cw.mjs");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/square.mjs");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/arrow-up.mjs");
/* harmony import */ var _components_ui_button__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/components/ui/button */ "./components/ui/button.tsx");
/* harmony import */ var _components_ui_textarea__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/components/ui/textarea */ "./components/ui/textarea.tsx");




function WorkAssistantComposer({ question, onQuestionChange, onSend, onStop, busy, disabled, error, canRetry, retrying, onRetry, }) {
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("form", { className: "shrink-0 space-y-2 border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]", onSubmit: (event) => {
            event.preventDefault();
            onSend(question);
        }, children: [error && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { className: "space-y-2", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", { role: "alert", className: "text-xs text-destructive", children: error }), canRetry && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_components_ui_button__WEBPACK_IMPORTED_MODULE_1__.Button, { type: "button", variant: "outline", size: "sm", loading: retrying, disabled: busy, onClick: onRetry, children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(lucide_react__WEBPACK_IMPORTED_MODULE_3__["default"], { "aria-hidden": "true" }), "Reload"] }))] })), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("label", { className: "sr-only", htmlFor: "work-question", children: "Question for AI Assistant" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { className: "flex items-end gap-2", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_textarea__WEBPACK_IMPORTED_MODULE_2__.Textarea, { id: "work-question", rows: 2, maxLength: 4000, value: question, disabled: busy || disabled, onChange: (event) => onQuestionChange(event.target.value), placeholder: "Ask about your work...", className: "max-h-32 min-h-16 flex-1 resize-y rounded-lg border bg-background p-2 text-sm", onKeyDown: (event) => {
                            if (event.key === "Enter" &&
                                !event.shiftKey &&
                                !event.nativeEvent.isComposing) {
                                event.preventDefault();
                                if (!busy && !disabled && question.trim())
                                    onSend(question);
                            }
                        } }), busy ? ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_button__WEBPACK_IMPORTED_MODULE_1__.Button, { type: "button", size: "icon", variant: "outline", "aria-label": "Stop response", onClick: () => onStop(), children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(lucide_react__WEBPACK_IMPORTED_MODULE_4__["default"], {}) })) : ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_button__WEBPACK_IMPORTED_MODULE_1__.Button, { type: "submit", size: "icon", "aria-label": "Send question", disabled: !question.trim() || disabled, children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(lucide_react__WEBPACK_IMPORTED_MODULE_5__["default"], {}) }))] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", { className: "text-xs text-muted-foreground", children: "AI can make mistakes. Check tasks and deadlines." })] }));
}


/***/ }),

/***/ "./features/work-assistant/components/work-assistant-message.tsx":
/*!***********************************************************************!*\
  !*** ./features/work-assistant/components/work-assistant-message.tsx ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ WorkAssistantMessage)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/react/jsx-runtime.js");
/* harmony import */ var next_link__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/link */ "../../docs/thesis/interfaces/source/next-link.jsx");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/bot.mjs");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/chevron-down.mjs");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/calendar.mjs");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/square-check-big.mjs");
/* harmony import */ var react_markdown__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! react-markdown */ "./node_modules/react-markdown/lib/index.js");
/* harmony import */ var remark_gfm__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! remark-gfm */ "./node_modules/remark-gfm/lib/index.js");
/* harmony import */ var _components_ui_collapsible__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/components/ui/collapsible */ "./components/ui/collapsible.tsx");
/* harmony import */ var _constants_work_assistant__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../constants/work-assistant */ "./features/work-assistant/constants/work-assistant.ts");
/* harmony import */ var _utils_task_reference__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/task-reference */ "./features/work-assistant/utils/task-reference.ts");
/* harmony import */ var _utils_remark_task_links__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../utils/remark-task-links */ "./features/work-assistant/utils/remark-task-links.ts");









function WorkAssistantMessage({ message, }) {
    const allowed = new Set(message.sources.map(_utils_task_reference__WEBPACK_IMPORTED_MODULE_4__.taskHref));
    const isUser = message.role === "user";
    if (isUser) {
        return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("article", { className: "flex flex-col items-end", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", { className: "mb-1.5 px-1 text-[11px] font-medium text-muted-foreground", children: "You" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", { className: "max-w-[85%] rounded-2xl rounded-tr-xs border border-primary/20 bg-primary/10 px-3.5 py-2.5 text-sm leading-relaxed text-foreground shadow-2xs", children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", { className: "break-words [&_p+p]:mt-2", children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(react_markdown__WEBPACK_IMPORTED_MODULE_6__.Markdown, { remarkPlugins: [remark_gfm__WEBPACK_IMPORTED_MODULE_7__["default"]], skipHtml: true, urlTransform: () => "", components: {
                                a: ({ children }) => (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", { children: children }),
                                img: () => null,
                            }, children: message.content }) }) })] }));
    }
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("article", { className: "min-w-0 rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { className: "mb-2.5 flex flex-wrap items-center justify-between gap-2", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("p", { className: "flex items-center gap-2 text-xs font-semibold text-foreground", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", { className: "grid size-6 shrink-0 place-items-center rounded-md bg-info-soft text-info-content ring-1 ring-border/60", children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(lucide_react__WEBPACK_IMPORTED_MODULE_8__["default"], { className: "size-3.5", "aria-hidden": "true" }) }), "AI Assistant"] }), message.context && !message.hidden && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("span", { className: "inline-flex items-center gap-1.5 text-[11px] text-muted-foreground", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", { className: "rounded-md border border-border/70 bg-muted/60 px-2 py-0.5 font-medium text-foreground/85", children: (0,_constants_work_assistant__WEBPACK_IMPORTED_MODULE_3__.formatMessageScopeLabel)(message.context.scope) }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", { "aria-hidden": "true", children: "\u00B7" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("time", { dateTime: message.context.fetchedAt, children: new Intl.DateTimeFormat("en-US", {
                                    timeZone: message.context.timeZone,
                                    day: "2-digit",
                                    month: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                }).format(new Date(message.context.fetchedAt)) })] }))] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", { className: "break-words text-sm leading-relaxed text-foreground/95 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_li+li]:mt-1.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2.5 [&_strong]:font-semibold [&_strong]:text-foreground [&_table]:my-2 [&_table]:w-full [&_table]:text-xs [&_td]:border-t [&_td]:border-border/60 [&_td]:py-1.5 [&_td]:pr-2 [&_th]:pb-1.5 [&_th]:pr-2 [&_th]:text-left [&_th]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5", children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(react_markdown__WEBPACK_IMPORTED_MODULE_6__.Markdown, { remarkPlugins: [
                        remark_gfm__WEBPACK_IMPORTED_MODULE_7__["default"],
                        [
                            _utils_remark_task_links__WEBPACK_IMPORTED_MODULE_5__.remarkTaskLinks,
                            {
                                sources: !message.hidden ? message.sources : [],
                            },
                        ],
                    ], skipHtml: true, urlTransform: (url) => (allowed.has(url) ? url : ""), components: {
                        a: ({ href, children }) => href && allowed.has(href) ? ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(next_link__WEBPACK_IMPORTED_MODULE_1__["default"], { href: href, scroll: false, className: "font-medium text-link underline decoration-link/40 underline-offset-4 transition-colors hover:decoration-link", children: children })) : ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", { children: children })),
                        img: () => null,
                    }, children: message.content }) }), message.sources.length > 0 && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_components_ui_collapsible__WEBPACK_IMPORTED_MODULE_2__.Collapsible, { className: "mt-3 border-t border-border/60 pt-2.5 text-xs", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_components_ui_collapsible__WEBPACK_IMPORTED_MODULE_2__.CollapsibleTrigger, { className: "group inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border/80 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("span", { children: ["Referenced tasks (", message.sources.length, ")"] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(lucide_react__WEBPACK_IMPORTED_MODULE_9__["default"], { className: "size-3.5 transition-transform duration-150 group-data-[state=open]:rotate-180", "aria-hidden": "true" })] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_collapsible__WEBPACK_IMPORTED_MODULE_2__.CollapsibleContent, { children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("ul", { className: "mt-2.5 flex flex-wrap gap-1.5", children: message.sources.map((source) => ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("li", { className: "max-w-full", children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(next_link__WEBPACK_IMPORTED_MODULE_1__["default"], { className: "group/chip inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border/80 bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-2xs transition-colors hover:border-primary/40 hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", href: (0,_utils_task_reference__WEBPACK_IMPORTED_MODULE_4__.taskHref)(source), scroll: false, children: [source.kind === "calendar" ? ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(lucide_react__WEBPACK_IMPORTED_MODULE_10__["default"], { className: "size-3.5 shrink-0 text-muted-foreground transition-colors group-hover/chip:text-primary", "aria-hidden": "true" })) : ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(lucide_react__WEBPACK_IMPORTED_MODULE_11__["default"], { className: "size-3.5 shrink-0 text-muted-foreground transition-colors group-hover/chip:text-primary", "aria-hidden": "true" })), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", { className: "truncate", children: source.title })] }) }, source.kind + source.id))) }) })] }))] }));
}


/***/ }),

/***/ "./features/work-assistant/components/work-assistant-panel.tsx":
/*!*********************************************************************!*\
  !*** ./features/work-assistant/components/work-assistant-panel.tsx ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ WorkAssistantPanel)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/react/jsx-runtime.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _components_ui_dialog__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/components/ui/dialog */ "./components/ui/dialog.tsx");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/bot.mjs");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/arrow-left.mjs");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/history.mjs");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/square-pen.mjs");
/* harmony import */ var lucide_react__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! lucide-react */ "./node_modules/lucide-react/dist/esm/icons/x.mjs");
/* harmony import */ var _components_ui_button__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/components/ui/button */ "./components/ui/button.tsx");
/* harmony import */ var _components_ui_sheet__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @/components/ui/sheet */ "./components/ui/sheet.tsx");
/* harmony import */ var _components_ui_use_media_query__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @/components/ui/use-media-query */ "./components/ui/use-media-query.ts");
/* harmony import */ var _hooks_use_work_assistant__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../hooks/use-work-assistant */ "../../docs/thesis/interfaces/source/work-state.jsx");
/* harmony import */ var _work_conversation_list__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./work-conversation-list */ "./features/work-assistant/components/work-conversation-list.tsx");
/* harmony import */ var _work_assistant_message__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./work-assistant-message */ "./features/work-assistant/components/work-assistant-message.tsx");
/* harmony import */ var _work_assistant_composer__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./work-assistant-composer */ "./features/work-assistant/components/work-assistant-composer.tsx");
/* harmony import */ var _constants_work_assistant__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../constants/work-assistant */ "./features/work-assistant/constants/work-assistant.ts");
/* harmony import */ var _components_ui_spinner__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! @/components/ui/spinner */ "./components/ui/spinner.tsx");
"use client";













function Conversation({ userId, projectId, audience, contextLabel, onClose, sessionId, onConversationChange, }) {
    const [showConversations, setShowConversations] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
    const assistant = (0,_hooks_use_work_assistant__WEBPACK_IMPORTED_MODULE_6__.useWorkAssistant)(userId, projectId, audience, sessionId, showConversations);
    const [question, setQuestion] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)("");
    const bottom = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
    const content = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
    (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
        if (showConversations)
            content.current?.scrollTo({ top: 0 });
    }, [showConversations]);
    const modal = (0,_components_ui_use_media_query__WEBPACK_IMPORTED_MODULE_5__.useMediaQuery)("(max-width: 639px)");
    (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
        bottom.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    }, [
        assistant.messages.length,
        assistant.pending,
        assistant.reply,
        assistant.status,
    ]);
    const send = (text) => {
        if (!assistant.status) {
            setQuestion("");
            void assistant.send(text);
        }
    };
    const error = assistant.error ||
        (assistant.createConversation.isError
            ? (0,_hooks_use_work_assistant__WEBPACK_IMPORTED_MODULE_6__.workError)(assistant.createConversation.error)
            : "") ||
        (assistant.history.isError ? (0,_hooks_use_work_assistant__WEBPACK_IMPORTED_MODULE_6__.workError)(assistant.history.error) : "");
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_components_ui_sheet__WEBPACK_IMPORTED_MODULE_4__.SheetPanel, { open: true, onClose: onClose, modal: modal, id: "work-assistant-panel", "aria-label": "AI Assistant", className: "fixed bottom-20 right-4 z-50 flex max-h-[calc(100dvh-6rem)] w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-background text-foreground shadow-xl max-sm:inset-x-0 max-sm:bottom-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-full max-sm:rounded-none", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("header", { className: "flex shrink-0 items-center gap-2.5 border-b px-4 py-3", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", { className: "grid size-8 shrink-0 place-items-center rounded-lg bg-info-soft text-info-content ring-1 ring-border/60", children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(lucide_react__WEBPACK_IMPORTED_MODULE_12__["default"], { className: "size-4", "aria-hidden": "true" }) }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { className: "min-w-0 flex-1", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("h2", { className: "text-sm font-semibold", children: "AI Assistant" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", { className: "text-xs text-muted-foreground", children: "Your tasks and planning" })] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_button__WEBPACK_IMPORTED_MODULE_3__.Button, { type: "button", variant: "ghost", size: "icon-sm", "aria-label": showConversations ? "Back to conversation" : "Conversations", title: showConversations ? "Back to conversation" : "Conversations", "aria-expanded": showConversations, "aria-controls": "work-conversation-list", disabled: !!assistant.status ||
                            assistant.createConversation.isPending ||
                            !assistant.history.isSuccess, onClick: () => setShowConversations(!showConversations), children: showConversations ? (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(lucide_react__WEBPACK_IMPORTED_MODULE_13__["default"], {}) : (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(lucide_react__WEBPACK_IMPORTED_MODULE_14__["default"], {}) }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_button__WEBPACK_IMPORTED_MODULE_3__.Button, { type: "button", variant: "ghost", size: "icon-sm", "aria-label": "New conversation", title: "New conversation", disabled: !!assistant.status ||
                            assistant.createConversation.isPending ||
                            !assistant.history.isSuccess, onClick: () => assistant.createConversation.mutate(undefined, {
                            onSuccess: (session) => onConversationChange(session.id),
                        }), children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(lucide_react__WEBPACK_IMPORTED_MODULE_15__["default"], {}) }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_button__WEBPACK_IMPORTED_MODULE_3__.Button, { type: "button", variant: "ghost", size: "icon-sm", "aria-label": "Close AI Assistant", onClick: onClose, children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(lucide_react__WEBPACK_IMPORTED_MODULE_16__["default"], {}) })] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { className: "flex shrink-0 items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2 text-xs", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", { className: "font-medium text-muted-foreground", children: "Context" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("span", { id: "work-scope", className: "inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-2.5 py-0.5 font-medium text-foreground shadow-2xs", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", { className: "size-1.5 rounded-full bg-primary", "aria-hidden": "true" }), contextLabel] })] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", { ref: content, className: "min-h-0 flex-1 overflow-y-auto overscroll-contain", children: showConversations ? ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, { children: [assistant.createConversation.isError && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", { role: "alert", className: "px-4 pt-4 text-xs text-destructive", children: (0,_hooks_use_work_assistant__WEBPACK_IMPORTED_MODULE_6__.workError)(assistant.createConversation.error) })), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_work_conversation_list__WEBPACK_IMPORTED_MODULE_7__["default"], { sessions: assistant.conversations.data?.pages.flatMap((page) => page.sessions) ?? [], activeId: assistant.history.data?.pages[0]?.id, loading: assistant.conversations.isPending, error: assistant.conversations.isError
                                ? (0,_hooks_use_work_assistant__WEBPACK_IMPORTED_MODULE_6__.workError)(assistant.conversations.error)
                                : undefined, hasMore: assistant.conversations.hasNextPage, loadingMore: assistant.conversations.isFetchingNextPage, onLoadMore: () => void assistant.conversations.fetchNextPage(), onRetry: () => void assistant.conversations.refetch(), onSelect: (id) => {
                                setShowConversations(false);
                                onConversationChange(id);
                            } })] })) : ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { className: "space-y-4 p-4", role: "log", "aria-label": "Conversation history", "aria-live": "polite", "aria-relevant": "additions", children: [assistant.history.hasNextPage && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_button__WEBPACK_IMPORTED_MODULE_3__.Button, { type: "button", size: "sm", variant: "ghost", loading: assistant.history.isFetchingNextPage, onClick: () => void assistant.history.fetchNextPage(), children: "Earlier messages" })), assistant.history.isPending && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", { className: "text-xs text-muted-foreground", children: "Loading conversation..." })), !assistant.messages.length &&
                            !assistant.pending &&
                            assistant.history.isSuccess && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { className: "space-y-4 py-4", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("h3", { className: "font-medium", children: "What would you like to work on?" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", { className: "mt-1 text-sm text-muted-foreground", children: "Ask a question or choose a starting point." })] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", { className: "grid grid-cols-2 gap-2", children: _constants_work_assistant__WEBPACK_IMPORTED_MODULE_10__.WORK_SUGGESTIONS.map(({ label, question: prompt }) => ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_button__WEBPACK_IMPORTED_MODULE_3__.Button, { type: "button", variant: "outline", size: "sm", className: "h-auto min-h-10 justify-start whitespace-normal rounded-xl text-left", disabled: !!assistant.status, onClick: () => send(prompt), children: label }, label))) })] })), !assistant.history.isError &&
                            assistant.messages.map((message) => ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_work_assistant_message__WEBPACK_IMPORTED_MODULE_8__["default"], { message: message }, message.id))), assistant.pending && (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_work_assistant_message__WEBPACK_IMPORTED_MODULE_8__["default"], { message: assistant.pending }), assistant.reply &&
                            !assistant.messages.some((message) => message.id === assistant.reply?.id) && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { "aria-busy": assistant.streaming, children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_work_assistant_message__WEBPACK_IMPORTED_MODULE_8__["default"], { message: assistant.reply }), assistant.streaming && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", { className: "mt-2 text-xs text-muted-foreground", children: "Writing response\u2026" }))] })), assistant.status && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("p", { role: "status", className: "flex items-center gap-2 text-xs text-muted-foreground", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_spinner__WEBPACK_IMPORTED_MODULE_11__.Spinner, { size: 14 }), assistant.status] })), assistant.notice && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", { role: "status", className: "text-xs text-muted-foreground", children: assistant.notice })), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", { ref: bottom })] })) }), !showConversations && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_work_assistant_composer__WEBPACK_IMPORTED_MODULE_9__["default"], { question: question, onQuestionChange: setQuestion, onSend: send, onStop: () => void assistant.stop(), busy: !!assistant.status, disabled: !assistant.history.isSuccess, error: error, canRetry: assistant.history.isError ||
                    Boolean(assistant.error && assistant.pending), retrying: assistant.history.isFetching, onRetry: () => {
                    if (assistant.history.isError) {
                        void assistant.history.refetch();
                    }
                    else if (assistant.error &&
                        assistant.pending &&
                        !assistant.status) {
                        void assistant.retry();
                    }
                } }))] }));
}
function WorkAssistantPanel({ userId, projectId, audience, contextLabel, onClose, }) {
    const scopeKey = (0,_constants_work_assistant__WEBPACK_IMPORTED_MODULE_10__.conversationContextKey)(projectId, audience);
    const [selectedSession, setSelectedSession] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)({ scopeKey });
    const sessionId = selectedSession.scopeKey === scopeKey
        ? selectedSession.sessionId
        : undefined;
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_dialog__WEBPACK_IMPORTED_MODULE_2__.DialogPortal, { children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Conversation, { userId: userId, projectId: projectId, audience: audience, contextLabel: contextLabel, sessionId: sessionId, onConversationChange: (id) => setSelectedSession({ scopeKey, sessionId: id }), onClose: onClose }, userId + ":" + scopeKey + ":" + (sessionId ?? "latest")) }));
}


/***/ }),

/***/ "./features/work-assistant/components/work-conversation-list.tsx":
/*!***********************************************************************!*\
  !*** ./features/work-assistant/components/work-conversation-list.tsx ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ WorkConversationList)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/react/jsx-runtime.js");
/* harmony import */ var _components_ui_button__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/components/ui/button */ "./components/ui/button.tsx");
"use client";


function WorkConversationList({ sessions, activeId, loading, error, hasMore, loadingMore, onLoadMore, onRetry, onSelect, }) {
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("section", { id: "work-conversation-list", "aria-label": "Conversations", className: "space-y-4 p-4", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("h3", { className: "text-sm font-semibold", children: "Conversations" }), loading && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", { role: "status", className: "text-xs text-muted-foreground", children: "Loading conversations..." })), error && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", { className: "space-y-2", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", { role: "alert", className: "text-xs text-destructive", children: error }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_button__WEBPACK_IMPORTED_MODULE_1__.Button, { size: "sm", variant: "outline", onClick: onRetry, children: "Retry" })] })), !loading && !error && sessions.length === 0 && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("p", { className: "text-xs text-muted-foreground", children: "No conversations yet." })), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("ul", { className: "space-y-1", children: sessions.map((session) => ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("li", { children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(_components_ui_button__WEBPACK_IMPORTED_MODULE_1__.Button, { type: "button", variant: session.id === activeId ? "secondary" : "ghost", "aria-current": session.id === activeId ? "true" : undefined, className: "h-auto w-full flex-col items-start gap-1 px-3 py-2 text-left", onClick: () => onSelect(session.id), children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("span", { className: "line-clamp-2 w-full whitespace-normal break-words text-sm font-medium", children: session.title }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("time", { dateTime: session.updatedAt, className: "text-xs font-normal text-muted-foreground", children: new Intl.DateTimeFormat("en-US", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                }).format(new Date(session.updatedAt)) })] }) }, session.id))) }), hasMore && ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_button__WEBPACK_IMPORTED_MODULE_1__.Button, { type: "button", variant: "ghost", size: "sm", loading: loadingMore, onClick: onLoadMore, children: "Load more" }))] }));
}


/***/ }),

/***/ "./features/work-assistant/utils/remark-task-links.ts":
/*!************************************************************!*\
  !*** ./features/work-assistant/utils/remark-task-links.ts ***!
  \************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   remarkTaskLinks: () => (/* binding */ remarkTaskLinks)
/* harmony export */ });
/* harmony import */ var _task_reference__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./task-reference */ "./features/work-assistant/utils/task-reference.ts");

function normalizeTitle(title) {
    return title.trim().replace(/\s+/g, " ").toLowerCase();
}
/** Link known task names in prose without rewriting Markdown or trusting model URLs. */
function remarkTaskLinks({ sources }) {
    const destinations = new Map();
    for (const source of sources) {
        const title = normalizeTitle(source.title);
        if (!title)
            continue;
        const urls = destinations.get(title) ?? new Set();
        urls.add((0,_task_reference__WEBPACK_IMPORTED_MODULE_0__.taskHref)(source));
        destinations.set(title, urls);
    }
    if (!destinations.size)
        return;
    const titles = [...destinations.keys()]
        .sort((first, second) => second.length - first.length)
        .map((title) => title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"));
    const mentions = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${titles.join("|")})(?![\\p{L}\\p{N}_])`, "giu");
    function linkText(value) {
        const children = [];
        let offset = 0;
        for (const match of value.matchAll(mentions)) {
            const title = match[0];
            const urls = destinations.get(normalizeTitle(title));
            // Identical task names can refer to different projects or calendar tasks.
            if (!urls || urls.size !== 1)
                continue;
            if (match.index > offset)
                children.push({
                    type: "text",
                    value: value.slice(offset, match.index),
                });
            children.push({
                type: "link",
                url: [...urls][0],
                children: [{ type: "text", value: title }],
            });
            offset = match.index + title.length;
        }
        if (offset < value.length)
            children.push({ type: "text", value: value.slice(offset) });
        return children;
    }
    function visit(parent) {
        parent.children = parent.children.flatMap((child) => {
            if (child.type === "text")
                return linkText(child.value);
            if (child.type !== "link" &&
                child.type !== "linkReference" &&
                "children" in child)
                visit(child);
            return [child];
        });
    }
    return (tree) => visit(tree);
}


/***/ }),

/***/ "./features/work-assistant/utils/task-reference.ts":
/*!*********************************************************!*\
  !*** ./features/work-assistant/utils/task-reference.ts ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   taskHref: () => (/* binding */ taskHref)
/* harmony export */ });
function taskHref(source) {
    if (source.kind === "project" && source.projectId)
        return "/projects/" + source.projectId + "?taskId=" + source.id;
    const timestamp = /[?&]t=(\d+)/.exec(source.url)?.[1];
    return ("/calendar?eventId=" + source.id + (timestamp ? "&t=" + timestamp : ""));
}


/***/ }),

/***/ "./node_modules/lucide-react/dist/esm/icons/arrow-up.mjs":
/*!***************************************************************!*\
  !*** ./node_modules/lucide-react/dist/esm/icons/arrow-up.mjs ***!
  \***************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   __iconNode: () => (/* binding */ __iconNode),
/* harmony export */   "default": () => (/* binding */ ArrowUp)
/* harmony export */ });
/* harmony import */ var _createLucideIcon_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../createLucideIcon.mjs */ "./node_modules/lucide-react/dist/esm/createLucideIcon.mjs");
/**
 * @license lucide-react v1.21.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */



const __iconNode = [
  ["path", { d: "m5 12 7-7 7 7", key: "hav0vg" }],
  ["path", { d: "M12 19V5", key: "x0mq9r" }]
];
const ArrowUp = (0,_createLucideIcon_mjs__WEBPACK_IMPORTED_MODULE_0__["default"])("arrow-up", __iconNode);


//# sourceMappingURL=arrow-up.mjs.map


/***/ })

}]);