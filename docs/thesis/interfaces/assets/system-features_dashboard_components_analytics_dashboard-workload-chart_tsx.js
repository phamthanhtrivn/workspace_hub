"use strict";
(globalThis["webpackChunkweb"] = globalThis["webpackChunkweb"] || []).push([["features_dashboard_components_analytics_dashboard-workload-chart_tsx"],{

/***/ "./features/dashboard/components/analytics/dashboard-workload-chart.tsx":
/*!******************************************************************************!*\
  !*** ./features/dashboard/components/analytics/dashboard-workload-chart.tsx ***!
  \******************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ DashboardWorkloadChart)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/react/jsx-runtime.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/chart/BarChart.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/cartesian/CartesianGrid.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/cartesian/XAxis.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/cartesian/YAxis.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/cartesian/BarStack.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/cartesian/Bar.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/component/LabelList.js");
/* harmony import */ var _components_ui_chart__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/components/ui/chart */ "./components/ui/chart.tsx");
/* harmony import */ var _constants_dashboard_chart_config__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../constants/dashboard-chart-config */ "./features/dashboard/constants/dashboard-chart-config.ts");
"use client";




function DashboardWorkloadChart({ projects }) {
    const names = new Map(projects.map((project) => [project.projectId, project.projectName]));
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_chart__WEBPACK_IMPORTED_MODULE_1__.ChartContainer, { config: _constants_dashboard_chart_config__WEBPACK_IMPORTED_MODULE_2__.WORKLOAD_CHART_CONFIG, className: "h-52 w-full @min-[640px]/dashboard:h-60", role: "group", "aria-label": "Top five projects by open tasks assigned to you", children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(recharts__WEBPACK_IMPORTED_MODULE_3__.BarChart, { data: projects, layout: "vertical", margin: { top: 4, right: 36, left: 0, bottom: 0 }, accessibilityLayer: true, children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(recharts__WEBPACK_IMPORTED_MODULE_4__.CartesianGrid, { horizontal: false, strokeDasharray: "3 4" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(recharts__WEBPACK_IMPORTED_MODULE_5__.XAxis, { type: "number", allowDecimals: false, axisLine: false, tickLine: false, tickMargin: 8 }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(recharts__WEBPACK_IMPORTED_MODULE_6__.YAxis, { type: "category", dataKey: "projectId", width: 120, axisLine: false, tickLine: false, tickMargin: 12, tickFormatter: (id) => {
                        const name = names.get(id) ?? id;
                        return name.length > 17 ? `${name.slice(0, 16)}…` : name;
                    } }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_chart__WEBPACK_IMPORTED_MODULE_1__.ChartLegend, { verticalAlign: "top", align: "left", content: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_chart__WEBPACK_IMPORTED_MODULE_1__.ChartLegendContent, { className: "justify-start pb-4 pt-0" }) }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_chart__WEBPACK_IMPORTED_MODULE_1__.ChartTooltip, { isAnimationActive: false, content: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_chart__WEBPACK_IMPORTED_MODULE_1__.ChartTooltipContent, { labelFormatter: (id) => names.get(String(id)) ?? id }) }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(recharts__WEBPACK_IMPORTED_MODULE_7__.BarStack, { radius: 4, children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(recharts__WEBPACK_IMPORTED_MODULE_8__.Bar, { dataKey: "overdue", fill: "var(--color-overdue)", maxBarSize: 20, isAnimationActive: false }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(recharts__WEBPACK_IMPORTED_MODULE_8__.Bar, { dataKey: "remaining", fill: "var(--color-remaining)", maxBarSize: 20, isAnimationActive: false, children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(recharts__WEBPACK_IMPORTED_MODULE_9__.LabelList, { dataKey: "total", position: "right", offset: 8, className: "fill-foreground text-xs font-medium tabular-nums" }) })] })] }) }));
}


/***/ }),

/***/ "./features/dashboard/constants/dashboard-chart-config.ts":
/*!****************************************************************!*\
  !*** ./features/dashboard/constants/dashboard-chart-config.ts ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   COMPLETION_CHART_CONFIG: () => (/* binding */ COMPLETION_CHART_CONFIG),
/* harmony export */   DEADLINE_CHART_CONFIG: () => (/* binding */ DEADLINE_CHART_CONFIG),
/* harmony export */   WORKLOAD_CHART_CONFIG: () => (/* binding */ WORKLOAD_CHART_CONFIG)
/* harmony export */ });
/* harmony import */ var _dashboard_analytics__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./dashboard-analytics */ "./features/dashboard/constants/dashboard-analytics.ts");

const DEADLINE_CHART_CONFIG = Object.fromEntries(_dashboard_analytics__WEBPACK_IMPORTED_MODULE_0__.TASK_DEADLINE_CATEGORIES.map((category, index) => [
    `deadline${index}`, { label: category.label, color: category.fill },
]));
const COMPLETION_CHART_CONFIG = {
    count: { label: "Completed tasks", color: "var(--chart-1)" },
};
const WORKLOAD_CHART_CONFIG = Object.fromEntries(_dashboard_analytics__WEBPACK_IMPORTED_MODULE_0__.WORKLOAD_SERIES.map((series) => [series.key, { label: series.label, color: series.fill }]));


/***/ })

}]);