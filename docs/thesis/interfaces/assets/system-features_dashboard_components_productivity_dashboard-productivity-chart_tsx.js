"use strict";
(globalThis["webpackChunkweb"] = globalThis["webpackChunkweb"] || []).push([["features_dashboard_components_productivity_dashboard-productivity-chart_tsx"],{

/***/ "./features/dashboard/components/productivity/dashboard-productivity-chart.tsx":
/*!*************************************************************************************!*\
  !*** ./features/dashboard/components/productivity/dashboard-productivity-chart.tsx ***!
  \*************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ DashboardProductivityChart)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/react/jsx-runtime.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/component/ResponsiveContainer.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/chart/BarChart.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/cartesian/CartesianGrid.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/cartesian/XAxis.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/cartesian/YAxis.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/component/Tooltip.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/cartesian/Bar.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/component/Cell.js");
"use client";


function DashboardProductivityChart({ days, }) {
    const data = days.map((day) => ({
        ...day,
        label: new Intl.DateTimeFormat("en", {
            weekday: "short",
            timeZone: "UTC",
        }).format(new Date(`${day.date}T12:00:00Z`)),
        minutes: Math.round(day.minutes),
    }));
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("div", { role: "group", className: "h-60 min-w-0", "aria-label": "Daily focus time in minutes for the last seven days", children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(recharts__WEBPACK_IMPORTED_MODULE_1__.ResponsiveContainer, { width: "100%", height: "100%", children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(recharts__WEBPACK_IMPORTED_MODULE_2__.BarChart, { data: data, margin: { top: 10, right: 0, left: -25, bottom: 0 }, accessibilityLayer: true, children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(recharts__WEBPACK_IMPORTED_MODULE_3__.CartesianGrid, { stroke: "var(--border)", vertical: false }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(recharts__WEBPACK_IMPORTED_MODULE_4__.XAxis, { dataKey: "label", axisLine: false, tickLine: false, tick: { fontSize: 12, fill: "var(--muted-foreground)" } }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(recharts__WEBPACK_IMPORTED_MODULE_5__.YAxis, { axisLine: false, tickLine: false, tick: { fontSize: 12, fill: "var(--muted-foreground)" } }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(recharts__WEBPACK_IMPORTED_MODULE_6__.Tooltip, { contentStyle: {
                            background: "var(--popover)",
                            border: "1px solid var(--border)",
                            color: "var(--popover-foreground)",
                            borderRadius: "var(--radius)",
                        }, labelStyle: { color: "var(--popover-foreground)" }, itemStyle: { color: "var(--popover-foreground)" }, cursor: { fill: "var(--accent)" }, labelFormatter: (_, payload) => payload?.[0]?.payload.date ?? "" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(recharts__WEBPACK_IMPORTED_MODULE_7__.Bar, { dataKey: "minutes", name: "Focus minutes", fill: "var(--chart-2)", radius: [0, 0, 0, 0], maxBarSize: 24, isAnimationActive: false, children: data.map((day, index) => ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(recharts__WEBPACK_IMPORTED_MODULE_8__.Cell, { fill: index === data.length - 1
                                ? "var(--chart-1)"
                                : "var(--chart-2)" }, day.date))) })] }) }) }));
}


/***/ })

}]);