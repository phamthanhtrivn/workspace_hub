"use strict";
(globalThis["webpackChunkweb"] = globalThis["webpackChunkweb"] || []).push([["features_dashboard_components_analytics_dashboard-deadline-chart_tsx"],{

/***/ "./features/dashboard/components/analytics/dashboard-deadline-chart.tsx":
/*!******************************************************************************!*\
  !*** ./features/dashboard/components/analytics/dashboard-deadline-chart.tsx ***!
  \******************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ DashboardDeadlineChart)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/react/jsx-runtime.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/chart/PieChart.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/polar/Pie.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/component/Label.js");
/* harmony import */ var _components_ui_chart__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/components/ui/chart */ "./components/ui/chart.tsx");
/* harmony import */ var _constants_dashboard_chart_config__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../constants/dashboard-chart-config */ "./features/dashboard/constants/dashboard-chart-config.ts");
"use client";




function DashboardDeadlineChart({ slices }) {
    const total = slices.reduce((sum, slice) => sum + slice.count, 0);
    const segments = slices.map((slice, index) => ({
        ...slice,
        category: `deadline${index}`,
        fill: `var(--color-deadline${index})`,
    })).filter((slice) => slice.count > 0);
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_chart__WEBPACK_IMPORTED_MODULE_1__.ChartContainer, { config: _constants_dashboard_chart_config__WEBPACK_IMPORTED_MODULE_2__.DEADLINE_CHART_CONFIG, className: "mx-auto h-56 w-full max-w-96 @min-[640px]/dashboard:h-72", role: "group", "aria-label": `Open tasks grouped by deadline: ${total} tasks`, children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(recharts__WEBPACK_IMPORTED_MODULE_3__.PieChart, { accessibilityLayer: true, children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_chart__WEBPACK_IMPORTED_MODULE_1__.ChartTooltip, { cursor: false, isAnimationActive: false, content: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_chart__WEBPACK_IMPORTED_MODULE_1__.ChartTooltipContent, { nameKey: "category", hideLabel: true }) }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(recharts__WEBPACK_IMPORTED_MODULE_4__.Pie, { data: segments, dataKey: "count", nameKey: "category", innerRadius: "72%", outerRadius: "92%", cornerRadius: 4, paddingAngle: segments.length > 1 ? 3 : 0, strokeWidth: 0, isAnimationActive: false, children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(recharts__WEBPACK_IMPORTED_MODULE_5__.Label, { content: ({ viewBox }) => {
                            if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox))
                                return null;
                            return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("text", { x: viewBox.cx, y: viewBox.cy, textAnchor: "middle", dominantBaseline: "middle", children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("tspan", { x: viewBox.cx, dy: "-0.2em", className: "fill-foreground text-3xl font-semibold tabular-nums @min-[640px]/dashboard:text-4xl", children: total.toLocaleString("en") }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)("tspan", { x: viewBox.cx, dy: "1.9em", className: "fill-muted-foreground text-xs", children: "Open tasks" })] }));
                        } }) })] }) }));
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


/***/ }),

/***/ "./node_modules/recharts/es6/chart/PieChart.js":
/*!*****************************************************!*\
  !*** ./node_modules/recharts/es6/chart/PieChart.js ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PieChart: () => (/* binding */ PieChart),
/* harmony export */   defaultPieChartProps: () => (/* binding */ defaultPieChartProps)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _state_optionsSlice__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../state/optionsSlice */ "./node_modules/recharts/es6/state/optionsSlice.js");
/* harmony import */ var _PolarChart__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./PolarChart */ "./node_modules/recharts/es6/chart/PolarChart.js");
/* harmony import */ var _util_resolveDefaultProps__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/resolveDefaultProps */ "./node_modules/recharts/es6/util/resolveDefaultProps.js");
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }





var allowedTooltipTypes = ['item'];
var defaultPieChartProps = _objectSpread(_objectSpread({}, _PolarChart__WEBPACK_IMPORTED_MODULE_1__.defaultPolarChartProps), {}, {
  layout: 'centric',
  startAngle: 0,
  endAngle: 360
});

/**
 * @consumes ResponsiveContainerContext
 * @provides PolarViewBoxContext
 * @provides PolarChartContext
 */
var PieChart = /*#__PURE__*/(0,react__WEBPACK_IMPORTED_MODULE_0__.forwardRef)((props, ref) => {
  var propsWithDefaults = (0,_util_resolveDefaultProps__WEBPACK_IMPORTED_MODULE_2__.resolveDefaultProps)(props, defaultPieChartProps);
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_PolarChart__WEBPACK_IMPORTED_MODULE_1__.PolarChart, {
    chartName: "PieChart",
    defaultTooltipEventType: "item",
    validateTooltipEventTypes: allowedTooltipTypes,
    tooltipPayloadSearcher: _state_optionsSlice__WEBPACK_IMPORTED_MODULE_3__.arrayTooltipSearcher,
    categoricalChartProps: propsWithDefaults,
    ref: ref
  });
});

/***/ }),

/***/ "./node_modules/recharts/es6/chart/PolarChart.js":
/*!*******************************************************!*\
  !*** ./node_modules/recharts/es6/chart/PolarChart.js ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PolarChart: () => (/* binding */ PolarChart),
/* harmony export */   defaultPolarChartProps: () => (/* binding */ defaultPolarChartProps)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _state_RechartsStoreProvider__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../state/RechartsStoreProvider */ "./node_modules/recharts/es6/state/RechartsStoreProvider.js");
/* harmony import */ var _context_chartDataContext__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../context/chartDataContext */ "./node_modules/recharts/es6/context/chartDataContext.js");
/* harmony import */ var _state_ReportMainChartProps__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../state/ReportMainChartProps */ "./node_modules/recharts/es6/state/ReportMainChartProps.js");
/* harmony import */ var _state_ReportChartProps__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../state/ReportChartProps */ "./node_modules/recharts/es6/state/ReportChartProps.js");
/* harmony import */ var _state_ReportEventSettings__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../state/ReportEventSettings */ "./node_modules/recharts/es6/state/ReportEventSettings.js");
/* harmony import */ var _state_ReportPolarOptions__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../state/ReportPolarOptions */ "./node_modules/recharts/es6/state/ReportPolarOptions.js");
/* harmony import */ var _CategoricalChart__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./CategoricalChart */ "./node_modules/recharts/es6/chart/CategoricalChart.js");
/* harmony import */ var _util_resolveDefaultProps__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/resolveDefaultProps */ "./node_modules/recharts/es6/util/resolveDefaultProps.js");
/* harmony import */ var _state_eventSettingsSlice__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../state/eventSettingsSlice */ "./node_modules/recharts/es6/state/eventSettingsSlice.js");
var _excluded = ["layout"];
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }











var defaultMargin = {
  top: 5,
  right: 5,
  bottom: 5,
  left: 5
};

/**
 * These default props are the same for all PolarChart components.
 */
var defaultPolarChartProps = _objectSpread({
  accessibilityLayer: true,
  stackOffset: 'none',
  barCategoryGap: '10%',
  barGap: 4,
  margin: defaultMargin,
  reverseStackOrder: false,
  syncMethod: 'index',
  layout: 'radial',
  responsive: false,
  cx: '50%',
  cy: '50%',
  innerRadius: 0,
  outerRadius: '80%'
}, _state_eventSettingsSlice__WEBPACK_IMPORTED_MODULE_1__.initialEventSettingsState);

/**
 * These props are required for the PolarChart to function correctly.
 * Users usually would not need to specify these explicitly,
 * because the convenience components like PieChart, RadarChart, etc.
 * will provide these defaults.
 * We can't have the defaults in this file because each of those convenience components
 * have their own opinions about what they should be.
 */

/**
 * These are one-time, immutable options that decide the chart's behavior.
 * Users who wish to call CartesianChart may decide to pass these options explicitly,
 * but usually we would expect that they use one of the convenience components like PieChart, RadarChart, etc.
 */

var PolarChart = /*#__PURE__*/(0,react__WEBPACK_IMPORTED_MODULE_0__.forwardRef)(function PolarChart(props, ref) {
  var _polarChartProps$id;
  var polarChartProps = (0,_util_resolveDefaultProps__WEBPACK_IMPORTED_MODULE_2__.resolveDefaultProps)(props.categoricalChartProps, defaultPolarChartProps);
  var layout = polarChartProps.layout,
    otherCategoricalProps = _objectWithoutProperties(polarChartProps, _excluded);
  var chartName = props.chartName,
    defaultTooltipEventType = props.defaultTooltipEventType,
    validateTooltipEventTypes = props.validateTooltipEventTypes,
    tooltipPayloadSearcher = props.tooltipPayloadSearcher;
  var options = {
    chartName,
    defaultTooltipEventType,
    validateTooltipEventTypes,
    tooltipPayloadSearcher,
    eventEmitter: undefined
  };
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_state_RechartsStoreProvider__WEBPACK_IMPORTED_MODULE_3__.RechartsStoreProvider, {
    preloadedState: {
      options
    },
    reduxStoreName: (_polarChartProps$id = polarChartProps.id) !== null && _polarChartProps$id !== void 0 ? _polarChartProps$id : chartName
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_context_chartDataContext__WEBPACK_IMPORTED_MODULE_4__.ChartDataContextProvider, {
    chartData: polarChartProps.data
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_state_ReportMainChartProps__WEBPACK_IMPORTED_MODULE_5__.ReportMainChartProps, {
    layout: layout,
    margin: polarChartProps.margin
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_state_ReportEventSettings__WEBPACK_IMPORTED_MODULE_6__.ReportEventSettings, {
    throttleDelay: polarChartProps.throttleDelay,
    throttledEvents: polarChartProps.throttledEvents
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_state_ReportChartProps__WEBPACK_IMPORTED_MODULE_7__.ReportChartProps, {
    baseValue: undefined,
    accessibilityLayer: polarChartProps.accessibilityLayer,
    barCategoryGap: polarChartProps.barCategoryGap,
    maxBarSize: polarChartProps.maxBarSize,
    stackOffset: polarChartProps.stackOffset,
    barGap: polarChartProps.barGap,
    barSize: polarChartProps.barSize,
    syncId: polarChartProps.syncId,
    syncMethod: polarChartProps.syncMethod,
    className: polarChartProps.className,
    reverseStackOrder: polarChartProps.reverseStackOrder
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_state_ReportPolarOptions__WEBPACK_IMPORTED_MODULE_8__.ReportPolarOptions, {
    cx: polarChartProps.cx,
    cy: polarChartProps.cy,
    startAngle: polarChartProps.startAngle,
    endAngle: polarChartProps.endAngle,
    innerRadius: polarChartProps.innerRadius,
    outerRadius: polarChartProps.outerRadius
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_CategoricalChart__WEBPACK_IMPORTED_MODULE_9__.CategoricalChart, _extends({}, otherCategoricalProps, {
    ref: ref
  })));
});

/***/ }),

/***/ "./node_modules/recharts/es6/polar/Pie.js":
/*!************************************************!*\
  !*** ./node_modules/recharts/es6/polar/Pie.js ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Pie: () => (/* binding */ Pie),
/* harmony export */   computePieSectors: () => (/* binding */ computePieSectors),
/* harmony export */   defaultPieProps: () => (/* binding */ defaultPieProps)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var es_toolkit_compat_get__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(/*! es-toolkit/compat/get */ "./node_modules/es-toolkit/dist/compat/object/get.mjs");
/* harmony import */ var clsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! clsx */ "./node_modules/clsx/dist/clsx.mjs");
/* harmony import */ var _state_selectors_pieSelectors__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../state/selectors/pieSelectors */ "./node_modules/recharts/es6/state/selectors/pieSelectors.js");
/* harmony import */ var _state_hooks__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../state/hooks */ "./node_modules/recharts/es6/state/hooks.js");
/* harmony import */ var _container_Layer__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ../container/Layer */ "./node_modules/recharts/es6/container/Layer.js");
/* harmony import */ var _shape_Curve__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../shape/Curve */ "./node_modules/recharts/es6/shape/Curve.js");
/* harmony import */ var _shape_Sector__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../shape/Sector */ "./node_modules/recharts/es6/shape/Sector.js");
/* harmony import */ var _component_Text__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../component/Text */ "./node_modules/recharts/es6/component/Text.js");
/* harmony import */ var _component_Cell__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../component/Cell */ "./node_modules/recharts/es6/component/Cell.js");
/* harmony import */ var _util_ReactUtils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../util/ReactUtils */ "./node_modules/recharts/es6/util/ReactUtils.js");
/* harmony import */ var _util_PolarUtils__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../util/PolarUtils */ "./node_modules/recharts/es6/util/PolarUtils.js");
/* harmony import */ var _util_DataUtils__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../util/DataUtils */ "./node_modules/recharts/es6/util/DataUtils.js");
/* harmony import */ var _util_ChartUtils__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../util/ChartUtils */ "./node_modules/recharts/es6/util/ChartUtils.js");
/* harmony import */ var _util_types__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! ../util/types */ "./node_modules/recharts/es6/util/types.js");
/* harmony import */ var _util_ActiveShapeUtils__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(/*! ../util/ActiveShapeUtils */ "./node_modules/recharts/es6/util/ActiveShapeUtils.js");
/* harmony import */ var _context_tooltipContext__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ../context/tooltipContext */ "./node_modules/recharts/es6/context/tooltipContext.js");
/* harmony import */ var _state_SetTooltipEntrySettings__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../state/SetTooltipEntrySettings */ "./node_modules/recharts/es6/state/SetTooltipEntrySettings.js");
/* harmony import */ var _state_selectors_tooltipSelectors__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ../state/selectors/tooltipSelectors */ "./node_modules/recharts/es6/state/selectors/tooltipSelectors.js");
/* harmony import */ var _state_SetLegendPayload__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../state/SetLegendPayload */ "./node_modules/recharts/es6/state/SetLegendPayload.js");
/* harmony import */ var _util_Constants__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! ../util/Constants */ "./node_modules/recharts/es6/util/Constants.js");
/* harmony import */ var _animation_AnimatedItems__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(/*! ../animation/AnimatedItems */ "./node_modules/recharts/es6/animation/AnimatedItems.js");
/* harmony import */ var _animation_matchBy__WEBPACK_IMPORTED_MODULE_29__ = __webpack_require__(/*! ../animation/matchBy */ "./node_modules/recharts/es6/animation/matchBy.js");
/* harmony import */ var _util_resolveDefaultProps__WEBPACK_IMPORTED_MODULE_30__ = __webpack_require__(/*! ../util/resolveDefaultProps */ "./node_modules/recharts/es6/util/resolveDefaultProps.js");
/* harmony import */ var _context_RegisterGraphicalItemId__WEBPACK_IMPORTED_MODULE_31__ = __webpack_require__(/*! ../context/RegisterGraphicalItemId */ "./node_modules/recharts/es6/context/RegisterGraphicalItemId.js");
/* harmony import */ var _state_SetGraphicalItem__WEBPACK_IMPORTED_MODULE_32__ = __webpack_require__(/*! ../state/SetGraphicalItem */ "./node_modules/recharts/es6/state/SetGraphicalItem.js");
/* harmony import */ var _util_svgPropertiesNoEvents__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ../util/svgPropertiesNoEvents */ "./node_modules/recharts/es6/util/svgPropertiesNoEvents.js");
/* harmony import */ var _component_LabelList__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ../component/LabelList */ "./node_modules/recharts/es6/component/LabelList.js");
/* harmony import */ var _component_Label__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(/*! ../component/Label */ "./node_modules/recharts/es6/component/Label.js");
/* harmony import */ var _zIndex_ZIndexLayer__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ../zIndex/ZIndexLayer */ "./node_modules/recharts/es6/zIndex/ZIndexLayer.js");
/* harmony import */ var _zIndex_DefaultZIndexes__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ../zIndex/DefaultZIndexes */ "./node_modules/recharts/es6/zIndex/DefaultZIndexes.js");
/* harmony import */ var _util_getClassNameFromUnknown__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../util/getClassNameFromUnknown */ "./node_modules/recharts/es6/util/getClassNameFromUnknown.js");
/* harmony import */ var _context_chartLayoutContext__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(/*! ../context/chartLayoutContext */ "./node_modules/recharts/es6/context/chartLayoutContext.js");
var _excluded = ["key"],
  _excluded2 = ["onMouseEnter", "onClick", "onMouseLeave"],
  _excluded3 = ["id"],
  _excluded4 = ["id"];
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }



































/**
 * The `label` prop in Pie accepts a variety of alternatives.
 */

/**
 * We spread the data object into the sector data item,
 * so we can't really know what is going to be inside.
 *
 * This type represents our best effort, but it all depends on the input data
 * and what is inside of it.
 *
 * https://github.com/recharts/recharts/issues/6380
 * https://github.com/recharts/recharts/discussions/6375
 */

/**
 * Internal props, combination of external props + defaultProps + private Recharts state
 */

var defaultPieSectorShape = _shape_Sector__WEBPACK_IMPORTED_MODULE_2__.Sector;
function SetPiePayloadLegend(props) {
  var cells = (0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => (0,_util_ReactUtils__WEBPACK_IMPORTED_MODULE_3__.findAllByType)(props.children, _component_Cell__WEBPACK_IMPORTED_MODULE_4__.Cell), [props.children]);
  var legendPayload = (0,_state_hooks__WEBPACK_IMPORTED_MODULE_5__.useAppSelector)(state => (0,_state_selectors_pieSelectors__WEBPACK_IMPORTED_MODULE_6__.selectPieLegend)(state, props.id, cells));
  if (legendPayload == null) {
    return null;
  }
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_state_SetLegendPayload__WEBPACK_IMPORTED_MODULE_7__.SetPolarLegendPayload, {
    legendPayload: legendPayload
  });
}
function getActiveShapeFill(activeShape) {
  // activeShape can be boolean/function/element/object; only element/object can carry a static fill value.
  if (activeShape == null || typeof activeShape === 'boolean' || typeof activeShape === 'function') {
    return undefined;
  }
  if (/*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.isValidElement(activeShape)) {
    var _activeShape$props;
    // React element form: <Sector fill="..."/> or custom element with fill prop.
    var _fill = (_activeShape$props = activeShape.props) === null || _activeShape$props === void 0 ? void 0 : _activeShape$props.fill;
    return typeof _fill === 'string' ? _fill : undefined;
  }
  var fill = activeShape.fill;
  return typeof fill === 'string' ? fill : undefined;
}
var SetPieTooltipEntrySettings = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.memo(_ref => {
  var dataKey = _ref.dataKey,
    nameKey = _ref.nameKey,
    sectors = _ref.sectors,
    stroke = _ref.stroke,
    strokeWidth = _ref.strokeWidth,
    fill = _ref.fill,
    name = _ref.name,
    hide = _ref.hide,
    tooltipType = _ref.tooltipType,
    formatter = _ref.formatter,
    id = _ref.id,
    activeShape = _ref.activeShape;
  var activeShapeFill = getActiveShapeFill(activeShape);
  var tooltipDataDefinedOnItem = sectors.map(sector => {
    var sectorTooltipPayload = sector.tooltipPayload;
    if (activeShapeFill == null || sectorTooltipPayload == null) {
      return sectorTooltipPayload;
    }
    return sectorTooltipPayload.map(item => _objectSpread(_objectSpread({}, item), {}, {
      color: activeShapeFill,
      fill: activeShapeFill
    }));
  });
  var tooltipEntrySettings = {
    dataDefinedOnItem: tooltipDataDefinedOnItem,
    getPosition: index => {
      var _sectors$Number;
      return (_sectors$Number = sectors[Number(index)]) === null || _sectors$Number === void 0 ? void 0 : _sectors$Number.tooltipPosition;
    },
    settings: {
      stroke,
      strokeWidth,
      fill,
      dataKey,
      nameKey,
      name: (0,_util_ChartUtils__WEBPACK_IMPORTED_MODULE_8__.getTooltipNameProp)(name, dataKey),
      hide,
      type: tooltipType,
      color: fill,
      unit: '',
      // why doesn't Pie support unit?
      formatter,
      graphicalItemId: id
    }
  };
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_state_SetTooltipEntrySettings__WEBPACK_IMPORTED_MODULE_9__.SetTooltipEntrySettings, {
    tooltipEntrySettings: tooltipEntrySettings
  });
});
var getTextAnchor = (x, cx) => {
  if (x > cx) {
    return 'start';
  }
  if (x < cx) {
    return 'end';
  }
  return 'middle';
};
var getOuterRadius = (dataPoint, outerRadius, maxPieRadius) => {
  if (typeof outerRadius === 'function') {
    return (0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_10__.getPercentValue)(outerRadius(dataPoint), maxPieRadius, maxPieRadius * 0.8);
  }
  return (0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_10__.getPercentValue)(outerRadius, maxPieRadius, maxPieRadius * 0.8);
};
var parseCoordinateOfPie = (pieSettings, offset, dataPoint) => {
  var top = offset.top,
    left = offset.left,
    width = offset.width,
    height = offset.height;
  var maxPieRadius = (0,_util_PolarUtils__WEBPACK_IMPORTED_MODULE_11__.getMaxRadius)(width, height);
  var cx = left + (0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_10__.getPercentValue)(pieSettings.cx, width, width / 2);
  var cy = top + (0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_10__.getPercentValue)(pieSettings.cy, height, height / 2);
  var innerRadius = (0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_10__.getPercentValue)(pieSettings.innerRadius, maxPieRadius, 0);
  var outerRadius = getOuterRadius(dataPoint, pieSettings.outerRadius, maxPieRadius);
  var maxRadius = pieSettings.maxRadius || Math.sqrt(width * width + height * height) / 2;
  return {
    cx,
    cy,
    innerRadius,
    outerRadius,
    maxRadius
  };
};
var parseDeltaAngle = (startAngle, endAngle) => {
  var sign = (0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_10__.mathSign)(endAngle - startAngle);
  var deltaAngle = Math.min(Math.abs(endAngle - startAngle), 360);
  return sign * deltaAngle;
};
var renderLabelLineItem = (option, props) => {
  if (/*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.isValidElement(option)) {
    // @ts-expect-error we can't know if the type of props matches the element
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.cloneElement(option, props);
  }
  if (typeof option === 'function') {
    return option(props);
  }
  var className = (0,clsx__WEBPACK_IMPORTED_MODULE_1__.clsx)('recharts-pie-label-line', typeof option !== 'boolean' ? option.className : '');
  // React doesn't like it when we spread a key property onto an element
  var key = props.key,
    otherProps = _objectWithoutProperties(props, _excluded);
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_shape_Curve__WEBPACK_IMPORTED_MODULE_12__.Curve, _extends({}, otherProps, {
    type: "linear",
    className: className
  }));
};
var renderLabelItem = (option, props, value) => {
  if (/*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.isValidElement(option)) {
    // @ts-expect-error element cloning is not typed
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.cloneElement(option, props);
  }
  var label = value;
  if (typeof option === 'function') {
    label = option(props);
    if (/*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.isValidElement(label)) {
      return label;
    }
  }
  var className = (0,clsx__WEBPACK_IMPORTED_MODULE_1__.clsx)('recharts-pie-label-text', (0,_util_getClassNameFromUnknown__WEBPACK_IMPORTED_MODULE_13__.getClassNameFromUnknown)(option));
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_component_Text__WEBPACK_IMPORTED_MODULE_14__.Text, _extends({}, props, {
    alignmentBaseline: "middle",
    className: className
  }), label);
};
function PieLabels(_ref2) {
  var sectors = _ref2.sectors,
    props = _ref2.props,
    showLabels = _ref2.showLabels;
  var label = props.label,
    labelLine = props.labelLine,
    dataKey = props.dataKey;
  if (!showLabels || !label || !sectors) {
    return null;
  }
  var pieProps = (0,_util_svgPropertiesNoEvents__WEBPACK_IMPORTED_MODULE_15__.svgPropertiesNoEvents)(props);
  var customLabelProps = (0,_util_svgPropertiesNoEvents__WEBPACK_IMPORTED_MODULE_15__.svgPropertiesNoEventsFromUnknown)(label);
  var customLabelLineProps = (0,_util_svgPropertiesNoEvents__WEBPACK_IMPORTED_MODULE_15__.svgPropertiesNoEventsFromUnknown)(labelLine);
  var offsetRadius = typeof label === 'object' && 'offsetRadius' in label && typeof label.offsetRadius === 'number' && label.offsetRadius || 20;
  var labels = sectors.map((entry, i) => {
    var midAngle = (entry.startAngle + entry.endAngle) / 2;
    var endPoint = (0,_util_PolarUtils__WEBPACK_IMPORTED_MODULE_11__.polarToCartesian)(entry.cx, entry.cy, entry.outerRadius + offsetRadius, midAngle);
    var labelProps = _objectSpread(_objectSpread(_objectSpread(_objectSpread({}, pieProps), entry), {}, {
      // @ts-expect-error customLabelProps is contributing unknown props
      stroke: 'none'
    }, customLabelProps), {}, {
      index: i,
      textAnchor: getTextAnchor(endPoint.x, entry.cx)
    }, endPoint);
    var lineProps = _objectSpread(_objectSpread(_objectSpread(_objectSpread({}, pieProps), entry), {}, {
      // @ts-expect-error customLabelLineProps is contributing unknown props
      fill: 'none',
      // @ts-expect-error customLabelLineProps is contributing unknown props
      stroke: entry.fill
    }, customLabelLineProps), {}, {
      index: i,
      points: [(0,_util_PolarUtils__WEBPACK_IMPORTED_MODULE_11__.polarToCartesian)(entry.cx, entry.cy, entry.outerRadius, midAngle), endPoint],
      key: 'line'
    });
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_zIndex_ZIndexLayer__WEBPACK_IMPORTED_MODULE_16__.ZIndexLayer, {
      zIndex: _zIndex_DefaultZIndexes__WEBPACK_IMPORTED_MODULE_17__.DefaultZIndexes.label,
      key: "label-".concat(entry.startAngle, "-").concat(entry.endAngle, "-").concat(entry.midAngle, "-").concat(i)
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_container_Layer__WEBPACK_IMPORTED_MODULE_18__.Layer, null, labelLine && renderLabelLineItem(labelLine, lineProps), renderLabelItem(label, labelProps, (0,_util_ChartUtils__WEBPACK_IMPORTED_MODULE_8__.getValueByDataKey)(entry, dataKey))));
  });
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_container_Layer__WEBPACK_IMPORTED_MODULE_18__.Layer, {
    className: "recharts-pie-labels"
  }, labels);
}
function PieLabelList(_ref3) {
  var sectors = _ref3.sectors,
    props = _ref3.props,
    showLabels = _ref3.showLabels;
  var label = props.label;
  if (typeof label === 'object' && label != null && 'position' in label) {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_component_LabelList__WEBPACK_IMPORTED_MODULE_19__.LabelListFromLabelProp, {
      label: label
    });
  }
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(PieLabels, {
    sectors: sectors,
    props: props,
    showLabels: showLabels
  });
}
function PieSectors(props) {
  var sectors = props.sectors,
    activeShape = props.activeShape,
    inactiveShapeProp = props.inactiveShape,
    allOtherPieProps = props.allOtherPieProps,
    shape = props.shape,
    id = props.id,
    animationElapsedTime = props.animationElapsedTime,
    isAnimating = props.isAnimating,
    isEntrance = props.isEntrance;
  var activeIndex = (0,_state_hooks__WEBPACK_IMPORTED_MODULE_5__.useAppSelector)(_state_selectors_tooltipSelectors__WEBPACK_IMPORTED_MODULE_20__.selectActiveTooltipIndex);
  var activeDataKey = (0,_state_hooks__WEBPACK_IMPORTED_MODULE_5__.useAppSelector)(_state_selectors_tooltipSelectors__WEBPACK_IMPORTED_MODULE_20__.selectActiveTooltipDataKey);
  var activeGraphicalItemId = (0,_state_hooks__WEBPACK_IMPORTED_MODULE_5__.useAppSelector)(_state_selectors_tooltipSelectors__WEBPACK_IMPORTED_MODULE_20__.selectActiveTooltipGraphicalItemId);
  var onMouseEnterFromProps = allOtherPieProps.onMouseEnter,
    onItemClickFromProps = allOtherPieProps.onClick,
    onMouseLeaveFromProps = allOtherPieProps.onMouseLeave,
    restOfAllOtherProps = _objectWithoutProperties(allOtherPieProps, _excluded2);
  var onMouseEnterFromContext = (0,_context_tooltipContext__WEBPACK_IMPORTED_MODULE_21__.useMouseEnterItemDispatch)(onMouseEnterFromProps, allOtherPieProps.dataKey, id);
  var onMouseLeaveFromContext = (0,_context_tooltipContext__WEBPACK_IMPORTED_MODULE_21__.useMouseLeaveItemDispatch)(onMouseLeaveFromProps);
  var onClickFromContext = (0,_context_tooltipContext__WEBPACK_IMPORTED_MODULE_21__.useMouseClickItemDispatch)(onItemClickFromProps, allOtherPieProps.dataKey, id);
  if (sectors == null || sectors.length === 0) {
    return null;
  }
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, sectors.map((entry, i) => {
    if ((entry === null || entry === void 0 ? void 0 : entry.startAngle) === 0 && (entry === null || entry === void 0 ? void 0 : entry.endAngle) === 0 && sectors.length !== 1) return null;

    // For Pie charts, when multiple Pies share the same dataKey, we need to ensure only the hovered Pie's sector is active.
    // We do this by checking if the active graphical item ID matches this Pie's ID.
    var graphicalItemMatches = activeGraphicalItemId == null || activeGraphicalItemId === id;
    var isActive = String(i) === activeIndex && (activeDataKey == null || allOtherPieProps.dataKey === activeDataKey) && graphicalItemMatches;
    var inactiveShape = activeIndex ? inactiveShapeProp : null;
    var sectorOptions = activeShape && isActive ? activeShape : inactiveShape;
    var sectorProps = _objectSpread(_objectSpread({}, entry), {}, {
      stroke: entry.stroke,
      tabIndex: -1,
      index: i,
      isActive,
      animationElapsedTime,
      isAnimating,
      isEntrance,
      [_util_Constants__WEBPACK_IMPORTED_MODULE_22__.DATA_ITEM_INDEX_ATTRIBUTE_NAME]: i,
      [_util_Constants__WEBPACK_IMPORTED_MODULE_22__.DATA_ITEM_GRAPHICAL_ITEM_ID_ATTRIBUTE_NAME]: id
    });
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_container_Layer__WEBPACK_IMPORTED_MODULE_18__.Layer, _extends({
      key: "sector-".concat(entry === null || entry === void 0 ? void 0 : entry.startAngle, "-").concat(entry === null || entry === void 0 ? void 0 : entry.endAngle, "-").concat(entry.midAngle, "-").concat(i),
      tabIndex: -1,
      className: "recharts-pie-sector"
    }, (0,_util_types__WEBPACK_IMPORTED_MODULE_23__.adaptEventsOfChild)(restOfAllOtherProps, entry, i), {
      onMouseEnter: onMouseEnterFromContext(entry, i),
      onMouseLeave: onMouseLeaveFromContext(entry, i),
      onClick: onClickFromContext(entry, i)
    }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_util_ActiveShapeUtils__WEBPACK_IMPORTED_MODULE_24__.Shape, {
      option: sectorOptions !== null && sectorOptions !== void 0 ? sectorOptions : shape,
      DefaultShape: defaultPieSectorShape,
      shapeProps: sectorProps
    }));
  }));
}
function computePieSectors(_ref4) {
  var _pieSettings$paddingA;
  var pieSettings = _ref4.pieSettings,
    displayedData = _ref4.displayedData,
    cells = _ref4.cells,
    offset = _ref4.offset;
  var cornerRadius = pieSettings.cornerRadius,
    startAngle = pieSettings.startAngle,
    endAngle = pieSettings.endAngle,
    dataKey = pieSettings.dataKey,
    nameKey = pieSettings.nameKey,
    tooltipType = pieSettings.tooltipType;
  var minAngle = Math.abs(pieSettings.minAngle);
  var deltaAngle = parseDeltaAngle(startAngle, endAngle);
  var absDeltaAngle = Math.abs(deltaAngle);
  var paddingAngle = displayedData.length <= 1 ? 0 : (_pieSettings$paddingA = pieSettings.paddingAngle) !== null && _pieSettings$paddingA !== void 0 ? _pieSettings$paddingA : 0;
  var notZeroItemCount = displayedData.filter(entry => (0,_util_ChartUtils__WEBPACK_IMPORTED_MODULE_8__.getValueByDataKey)(entry, dataKey, 0) !== 0).length;
  var totalPaddingAngle = (absDeltaAngle >= 360 ? notZeroItemCount : notZeroItemCount - 1) * paddingAngle;
  var sum = displayedData.reduce((result, entry) => {
    var val = (0,_util_ChartUtils__WEBPACK_IMPORTED_MODULE_8__.getValueByDataKey)(entry, dataKey, 0);
    return result + ((0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_10__.isNumber)(val) ? val : 0);
  }, 0);

  // Only apply minAngle redistribution when at least one non-zero segment's
  // natural angle falls below the minAngle threshold. Otherwise, minAngle
  // unnecessarily shifts all segments even when none need the boost.
  // See: https://github.com/recharts/recharts/issues/6814
  var needsMinAngleAdjustment = minAngle > 0 && sum > 0 && displayedData.some(entry => {
    var val = (0,_util_ChartUtils__WEBPACK_IMPORTED_MODULE_8__.getValueByDataKey)(entry, dataKey, 0);
    var percent = ((0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_10__.isNumber)(val) ? val : 0) / sum;
    return val !== 0 && percent * absDeltaAngle < minAngle;
  });
  var effectiveMinAngle = needsMinAngleAdjustment ? minAngle : 0;
  var realTotalAngle = absDeltaAngle - notZeroItemCount * effectiveMinAngle - totalPaddingAngle;
  var sectors;
  if (sum > 0) {
    var prev;
    sectors = displayedData.map((entry, i) => {
      var val = (0,_util_ChartUtils__WEBPACK_IMPORTED_MODULE_8__.getValueByDataKey)(entry, dataKey, 0);
      var name = (0,_util_ChartUtils__WEBPACK_IMPORTED_MODULE_8__.getValueByDataKey)(entry, nameKey, i);
      var coordinate = parseCoordinateOfPie(pieSettings, offset, entry);
      var percent = ((0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_10__.isNumber)(val) ? val : 0) / sum;
      var tempStartAngle;

      // @ts-expect-error can't spread unknown
      var entryWithCellInfo = _objectSpread(_objectSpread({}, entry), cells && cells[i] && cells[i].props);
      var sectorColor = entryWithCellInfo != null && 'fill' in entryWithCellInfo && typeof entryWithCellInfo.fill === 'string' ? entryWithCellInfo.fill : pieSettings.fill;
      if (i) {
        tempStartAngle = prev.endAngle + (0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_10__.mathSign)(deltaAngle) * paddingAngle * (val !== 0 ? 1 : 0);
      } else {
        tempStartAngle = startAngle;
      }
      var tempEndAngle = tempStartAngle + (0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_10__.mathSign)(deltaAngle) * ((val !== 0 ? effectiveMinAngle : 0) + percent * realTotalAngle);
      var midAngle = (tempStartAngle + tempEndAngle) / 2;
      var middleRadius = (coordinate.innerRadius + coordinate.outerRadius) / 2;
      var tooltipPayload = [{
        name,
        value: val,
        payload: entryWithCellInfo,
        dataKey,
        type: tooltipType,
        color: sectorColor,
        fill: sectorColor,
        graphicalItemId: pieSettings.id
      }];
      var tooltipPosition = (0,_util_PolarUtils__WEBPACK_IMPORTED_MODULE_11__.polarToCartesian)(coordinate.cx, coordinate.cy, middleRadius, midAngle);
      prev = _objectSpread(_objectSpread(_objectSpread(_objectSpread({}, pieSettings.presentationProps), {}, {
        percent,
        cornerRadius: typeof cornerRadius === 'string' ? parseFloat(cornerRadius) : cornerRadius,
        name,
        tooltipPayload,
        midAngle,
        middleRadius,
        tooltipPosition
      }, entryWithCellInfo), coordinate), {}, {
        value: val,
        dataKey,
        startAngle: tempStartAngle,
        endAngle: tempEndAngle,
        payload: entryWithCellInfo,
        paddingAngle: val !== 0 ? (0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_10__.mathSign)(deltaAngle) * paddingAngle : 0
      });
      return prev;
    });
  }
  return sectors;
}
function PieLabelListProvider(_ref5) {
  var showLabels = _ref5.showLabels,
    sectors = _ref5.sectors,
    children = _ref5.children;
  var labelListEntries = (0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    if (!showLabels || !sectors) {
      return [];
    }
    return sectors.map(entry => ({
      value: entry.value,
      payload: entry.payload,
      clockWise: false,
      parentViewBox: undefined,
      viewBox: {
        cx: entry.cx,
        cy: entry.cy,
        innerRadius: entry.innerRadius,
        outerRadius: entry.outerRadius,
        startAngle: entry.startAngle,
        endAngle: entry.endAngle,
        clockWise: false
      },
      fill: entry.fill
    }));
  }, [sectors, showLabels]);
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_component_LabelList__WEBPACK_IMPORTED_MODULE_19__.PolarLabelListContextProvider, {
    value: showLabels ? labelListEntries : undefined
  }, children);
}
var defaultPieAnimateItems = (items, animationElapsedTime) => {
  if (items == null) return [];
  var stepData = [];
  var firstNonRemoved = items.find(item => item.status !== 'removed');
  var curAngle = firstNonRemoved ? firstNonRemoved.next.startAngle : 0;
  items.forEach((item, index) => {
    if (item.status === 'removed') return;
    var paddingAngle = index > 0 ? (0,es_toolkit_compat_get__WEBPACK_IMPORTED_MODULE_25__.get)(item.next, 'paddingAngle', 0) : 0;
    if (item.status === 'matched') {
      var angle = (0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_10__.interpolate)(item.prev.endAngle - item.prev.startAngle, item.next.endAngle - item.next.startAngle, animationElapsedTime);
      var latest = _objectSpread(_objectSpread({}, item.next), {}, {
        startAngle: curAngle + paddingAngle,
        endAngle: curAngle + angle + paddingAngle
      });
      stepData.push(latest);
      curAngle = latest.endAngle;
    } else {
      // added
      var deltaAngle = (0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_10__.interpolate)(0, item.next.endAngle - item.next.startAngle, animationElapsedTime);
      var _latest = _objectSpread(_objectSpread({}, item.next), {}, {
        startAngle: curAngle + paddingAngle,
        endAngle: curAngle + deltaAngle + paddingAngle
      });
      stepData.push(_latest);
      curAngle = _latest.endAngle;
    }
  });
  return stepData;
};
function SectorsWithAnimation(_ref6) {
  var _firstSector$cx, _firstSector$cy, _firstSector$innerRad, _firstSector$outerRad;
  var props = _ref6.props,
    previousSectorsRef = _ref6.previousSectorsRef,
    id = _ref6.id;
  var sectors = props.sectors,
    activeShape = props.activeShape,
    inactiveShape = props.inactiveShape,
    animationInterpolateFn = props.animationInterpolateFn;
  var _useAnimationCallback = (0,_animation_AnimatedItems__WEBPACK_IMPORTED_MODULE_26__.useAnimationCallbacks)(props.onAnimationStart, props.onAnimationEnd),
    isAnimating = _useAnimationCallback.isAnimating,
    handleAnimationStart = _useAnimationCallback.handleAnimationStart,
    handleAnimationEnd = _useAnimationCallback.handleAnimationEnd;
  var layout = (0,_context_chartLayoutContext__WEBPACK_IMPORTED_MODULE_27__.usePolarChartLayout)();
  if (layout == null) return null;
  var firstSector = sectors[0];
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(PieLabelListProvider, {
    showLabels: !isAnimating,
    sectors: sectors
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_animation_AnimatedItems__WEBPACK_IMPORTED_MODULE_26__.AnimatedItems, {
    animationInput: props,
    animationIdPrefix: "recharts-pie-",
    items: sectors,
    previousItemsRef: previousSectorsRef,
    isAnimationActive: props.isAnimationActive,
    animationBegin: props.animationBegin,
    animationDuration: props.animationDuration,
    animationEasing: props.animationEasing,
    onAnimationStart: handleAnimationStart,
    onAnimationEnd: handleAnimationEnd,
    animationInterpolateFn: animationInterpolateFn,
    animationMatchBy: props.animationMatchBy,
    layout: layout
  }, (stepData, animationElapsedTime, isEntrance) => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_container_Layer__WEBPACK_IMPORTED_MODULE_18__.Layer, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(PieSectors, {
    sectors: stepData,
    activeShape: activeShape,
    inactiveShape: inactiveShape,
    allOtherPieProps: props,
    shape: props.shape,
    id: id,
    animationElapsedTime: animationElapsedTime,
    isAnimating: isAnimating || animationElapsedTime < 1,
    isEntrance: isEntrance
  }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(PieLabelList, {
    showLabels: !isAnimating,
    sectors: sectors,
    props: props
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_component_Label__WEBPACK_IMPORTED_MODULE_28__.PolarLabelContextProvider, {
    cx: (_firstSector$cx = firstSector === null || firstSector === void 0 ? void 0 : firstSector.cx) !== null && _firstSector$cx !== void 0 ? _firstSector$cx : 0,
    cy: (_firstSector$cy = firstSector === null || firstSector === void 0 ? void 0 : firstSector.cy) !== null && _firstSector$cy !== void 0 ? _firstSector$cy : 0,
    innerRadius: (_firstSector$innerRad = firstSector === null || firstSector === void 0 ? void 0 : firstSector.innerRadius) !== null && _firstSector$innerRad !== void 0 ? _firstSector$innerRad : 0,
    outerRadius: (_firstSector$outerRad = firstSector === null || firstSector === void 0 ? void 0 : firstSector.outerRadius) !== null && _firstSector$outerRad !== void 0 ? _firstSector$outerRad : 0,
    startAngle: props.startAngle,
    endAngle: props.endAngle,
    clockWise: false
  }, props.children));
}
var defaultPieProps = {
  animationBegin: 400,
  animationDuration: 1500,
  animationEasing: 'ease',
  animationInterpolateFn: defaultPieAnimateItems,
  animationMatchBy: _animation_matchBy__WEBPACK_IMPORTED_MODULE_29__.matchAppend,
  cx: '50%',
  cy: '50%',
  dataKey: 'value',
  endAngle: 360,
  fill: '#808080',
  hide: false,
  innerRadius: 0,
  isAnimationActive: 'auto',
  label: false,
  labelLine: true,
  legendType: 'rect',
  minAngle: 0,
  nameKey: 'name',
  outerRadius: '80%',
  paddingAngle: 0,
  rootTabIndex: 0,
  shape: defaultPieSectorShape,
  startAngle: 0,
  stroke: '#fff',
  zIndex: _zIndex_DefaultZIndexes__WEBPACK_IMPORTED_MODULE_17__.DefaultZIndexes.area
};
function PieImpl(props) {
  var id = props.id,
    propsWithoutId = _objectWithoutProperties(props, _excluded3);
  var hide = props.hide,
    className = props.className,
    rootTabIndex = props.rootTabIndex;
  var cells = (0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => (0,_util_ReactUtils__WEBPACK_IMPORTED_MODULE_3__.findAllByType)(props.children, _component_Cell__WEBPACK_IMPORTED_MODULE_4__.Cell), [props.children]);
  var sectors = (0,_state_hooks__WEBPACK_IMPORTED_MODULE_5__.useAppSelector)(state => (0,_state_selectors_pieSelectors__WEBPACK_IMPORTED_MODULE_6__.selectPieSectors)(state, id, cells));
  var previousSectorsRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  var layerClass = (0,clsx__WEBPACK_IMPORTED_MODULE_1__.clsx)('recharts-pie', className);
  if (hide || sectors == null) {
    previousSectorsRef.current = null;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_container_Layer__WEBPACK_IMPORTED_MODULE_18__.Layer, {
      tabIndex: rootTabIndex,
      className: layerClass
    });
  }
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_zIndex_ZIndexLayer__WEBPACK_IMPORTED_MODULE_16__.ZIndexLayer, {
    zIndex: props.zIndex
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(SetPieTooltipEntrySettings, {
    dataKey: props.dataKey,
    nameKey: props.nameKey,
    sectors: sectors,
    stroke: props.stroke,
    strokeWidth: props.strokeWidth,
    fill: props.fill,
    name: props.name,
    hide: props.hide,
    tooltipType: props.tooltipType,
    formatter: props.formatter,
    id: id,
    activeShape: props.activeShape
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_container_Layer__WEBPACK_IMPORTED_MODULE_18__.Layer, {
    tabIndex: rootTabIndex,
    className: layerClass
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(SectorsWithAnimation, {
    props: _objectSpread(_objectSpread({}, propsWithoutId), {}, {
      sectors
    }),
    previousSectorsRef: previousSectorsRef,
    id: id
  })));
}
/**
 * @consumes PolarChartContext
 * @provides LabelListContext
 * @provides CellReader
 */
function PieFn(outsideProps) {
  var props = (0,_util_resolveDefaultProps__WEBPACK_IMPORTED_MODULE_30__.resolveDefaultProps)(outsideProps, defaultPieProps);
  var externalId = props.id,
    propsWithoutId = _objectWithoutProperties(props, _excluded4);
  var presentationProps = (0,_util_svgPropertiesNoEvents__WEBPACK_IMPORTED_MODULE_15__.svgPropertiesNoEvents)(propsWithoutId);
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_context_RegisterGraphicalItemId__WEBPACK_IMPORTED_MODULE_31__.RegisterGraphicalItemId, {
    id: externalId,
    type: "pie"
  }, id => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_state_SetGraphicalItem__WEBPACK_IMPORTED_MODULE_32__.SetPolarGraphicalItem, {
    type: "pie",
    id: id,
    data: propsWithoutId.data,
    dataKey: propsWithoutId.dataKey,
    hide: propsWithoutId.hide,
    angleAxisId: 0,
    radiusAxisId: 0,
    name: propsWithoutId.name,
    nameKey: propsWithoutId.nameKey,
    tooltipType: propsWithoutId.tooltipType,
    legendType: propsWithoutId.legendType,
    fill: propsWithoutId.fill,
    cx: propsWithoutId.cx,
    cy: propsWithoutId.cy,
    startAngle: propsWithoutId.startAngle,
    endAngle: propsWithoutId.endAngle,
    paddingAngle: propsWithoutId.paddingAngle,
    minAngle: propsWithoutId.minAngle,
    innerRadius: propsWithoutId.innerRadius,
    outerRadius: propsWithoutId.outerRadius,
    cornerRadius: propsWithoutId.cornerRadius,
    presentationProps: presentationProps,
    maxRadius: props.maxRadius
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(SetPiePayloadLegend, _extends({}, propsWithoutId, {
    id: id
  })), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(PieImpl, _extends({}, propsWithoutId, {
    id: id
  }))));
}
var Pie = PieFn;
// @ts-expect-error we need to set the displayName for debugging purposes
Pie.displayName = 'Pie';

/***/ }),

/***/ "./node_modules/recharts/es6/state/ReportPolarOptions.js":
/*!***************************************************************!*\
  !*** ./node_modules/recharts/es6/state/ReportPolarOptions.js ***!
  \***************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ReportPolarOptions: () => (/* binding */ ReportPolarOptions)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _hooks__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./hooks */ "./node_modules/recharts/es6/state/hooks.js");
/* harmony import */ var _polarOptionsSlice__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./polarOptionsSlice */ "./node_modules/recharts/es6/state/polarOptionsSlice.js");



function ReportPolarOptions(props) {
  var dispatch = (0,_hooks__WEBPACK_IMPORTED_MODULE_1__.useAppDispatch)();
  (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(() => {
    dispatch((0,_polarOptionsSlice__WEBPACK_IMPORTED_MODULE_2__.updatePolarOptions)(props));
  }, [dispatch, props]);
  return null;
}

/***/ }),

/***/ "./node_modules/recharts/es6/state/selectors/pieSelectors.js":
/*!*******************************************************************!*\
  !*** ./node_modules/recharts/es6/state/selectors/pieSelectors.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   selectDisplayedData: () => (/* binding */ selectDisplayedData),
/* harmony export */   selectPieLegend: () => (/* binding */ selectPieLegend),
/* harmony export */   selectPieSectors: () => (/* binding */ selectPieSectors)
/* harmony export */ });
/* harmony import */ var reselect__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! reselect */ "./node_modules/reselect/dist/reselect.mjs");
/* harmony import */ var _polar_Pie__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../polar/Pie */ "./node_modules/recharts/es6/polar/Pie.js");
/* harmony import */ var _dataSelectors__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./dataSelectors */ "./node_modules/recharts/es6/state/selectors/dataSelectors.js");
/* harmony import */ var _selectChartOffsetInternal__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./selectChartOffsetInternal */ "./node_modules/recharts/es6/state/selectors/selectChartOffsetInternal.js");
/* harmony import */ var _util_ChartUtils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../util/ChartUtils */ "./node_modules/recharts/es6/util/ChartUtils.js");
/* harmony import */ var _polarSelectors__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./polarSelectors */ "./node_modules/recharts/es6/state/selectors/polarSelectors.js");
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }






var pickId = (_state, id) => id;
var selectSynchronisedPieSettings = (0,reselect__WEBPACK_IMPORTED_MODULE_0__.createSelector)([_polarSelectors__WEBPACK_IMPORTED_MODULE_1__.selectUnfilteredPolarItems, pickId], (graphicalItems, id) => graphicalItems.filter(item => item.type === 'pie').find(item => item.id === id));

// Keep stable reference to an empty array to prevent re-renders
var emptyArray = [];
var pickCells = (_state, _id, cells) => {
  if ((cells === null || cells === void 0 ? void 0 : cells.length) === 0) {
    return emptyArray;
  }
  return cells;
};
var selectDisplayedData = (0,reselect__WEBPACK_IMPORTED_MODULE_0__.createSelector)([_dataSelectors__WEBPACK_IMPORTED_MODULE_2__.selectChartDataAndAlwaysIgnoreIndexes, selectSynchronisedPieSettings, pickCells], (_ref, pieSettings, cells) => {
  var chartData = _ref.chartData;
  if (pieSettings == null) {
    return undefined;
  }
  var displayedData;
  if ((pieSettings === null || pieSettings === void 0 ? void 0 : pieSettings.data) != null && pieSettings.data.length > 0) {
    displayedData = pieSettings.data;
  } else {
    displayedData = chartData;
  }
  if ((!displayedData || !displayedData.length) && cells != null) {
    displayedData = cells.map(cell => _objectSpread(_objectSpread({}, pieSettings.presentationProps), cell.props));
  }
  if (displayedData == null) {
    return undefined;
  }
  return displayedData;
});
var selectPieLegend = (0,reselect__WEBPACK_IMPORTED_MODULE_0__.createSelector)([selectDisplayedData, selectSynchronisedPieSettings, pickCells], (displayedData, pieSettings, cells) => {
  if (displayedData == null || pieSettings == null) {
    return undefined;
  }
  return displayedData.map((entry, i) => {
    var _cells$i;
    var name = (0,_util_ChartUtils__WEBPACK_IMPORTED_MODULE_3__.getValueByDataKey)(entry, pieSettings.nameKey, pieSettings.name);
    var color;
    if (cells !== null && cells !== void 0 && (_cells$i = cells[i]) !== null && _cells$i !== void 0 && (_cells$i = _cells$i.props) !== null && _cells$i !== void 0 && _cells$i.fill) {
      color = cells[i].props.fill;
    } else if (typeof entry === 'object' && entry != null && 'fill' in entry) {
      color = entry.fill;
    } else {
      color = pieSettings.fill;
    }
    return {
      value: (0,_util_ChartUtils__WEBPACK_IMPORTED_MODULE_3__.getTooltipNameProp)(name, pieSettings.dataKey),
      dataKey: pieSettings.dataKey,
      color,
      // @ts-expect-error Legend payload.payload says it wants objects but our data can be unknown
      payload: entry,
      type: pieSettings.legendType
    };
  });
});
var selectPieSectors = (0,reselect__WEBPACK_IMPORTED_MODULE_0__.createSelector)([selectDisplayedData, selectSynchronisedPieSettings, pickCells, _selectChartOffsetInternal__WEBPACK_IMPORTED_MODULE_4__.selectChartOffsetInternal], (displayedData, pieSettings, cells, offset) => {
  if (pieSettings == null || displayedData == null) {
    return undefined;
  }
  return (0,_polar_Pie__WEBPACK_IMPORTED_MODULE_5__.computePieSectors)({
    offset,
    pieSettings,
    displayedData,
    cells
  });
});

/***/ }),

/***/ "./node_modules/recharts/es6/state/selectors/polarSelectors.js":
/*!*********************************************************************!*\
  !*** ./node_modules/recharts/es6/state/selectors/polarSelectors.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   selectAllPolarAppliedNumericalValues: () => (/* binding */ selectAllPolarAppliedNumericalValues),
/* harmony export */   selectPolarAppliedValues: () => (/* binding */ selectPolarAppliedValues),
/* harmony export */   selectPolarAxisCheckedDomain: () => (/* binding */ selectPolarAxisCheckedDomain),
/* harmony export */   selectPolarAxisDomain: () => (/* binding */ selectPolarAxisDomain),
/* harmony export */   selectPolarAxisDomainIncludingNiceTicks: () => (/* binding */ selectPolarAxisDomainIncludingNiceTicks),
/* harmony export */   selectPolarDisplayedData: () => (/* binding */ selectPolarDisplayedData),
/* harmony export */   selectPolarItemsSettings: () => (/* binding */ selectPolarItemsSettings),
/* harmony export */   selectPolarNiceTicks: () => (/* binding */ selectPolarNiceTicks),
/* harmony export */   selectUnfilteredPolarItems: () => (/* binding */ selectUnfilteredPolarItems)
/* harmony export */ });
/* harmony import */ var reselect__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! reselect */ "./node_modules/reselect/dist/reselect.mjs");
/* harmony import */ var _dataSelectors__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./dataSelectors */ "./node_modules/recharts/es6/state/selectors/dataSelectors.js");
/* harmony import */ var _axisSelectors__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./axisSelectors */ "./node_modules/recharts/es6/state/selectors/axisSelectors.js");
/* harmony import */ var _context_chartLayoutContext__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../context/chartLayoutContext */ "./node_modules/recharts/es6/context/chartLayoutContext.js");
/* harmony import */ var _util_ChartUtils__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../util/ChartUtils */ "./node_modules/recharts/es6/util/ChartUtils.js");
/* harmony import */ var _pickAxisType__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./pickAxisType */ "./node_modules/recharts/es6/state/selectors/pickAxisType.js");
/* harmony import */ var _pickAxisId__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./pickAxisId */ "./node_modules/recharts/es6/state/selectors/pickAxisId.js");
/* harmony import */ var _rootPropsSelectors__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./rootPropsSelectors */ "./node_modules/recharts/es6/state/selectors/rootPropsSelectors.js");
/* harmony import */ var _combiners_combineCheckedDomain__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./combiners/combineCheckedDomain */ "./node_modules/recharts/es6/state/selectors/combiners/combineCheckedDomain.js");









var selectUnfilteredPolarItems = state => state.graphicalItems.polarItems;
var selectAxisPredicate = (0,reselect__WEBPACK_IMPORTED_MODULE_0__.createSelector)([_pickAxisType__WEBPACK_IMPORTED_MODULE_1__.pickAxisType, _pickAxisId__WEBPACK_IMPORTED_MODULE_2__.pickAxisId], _axisSelectors__WEBPACK_IMPORTED_MODULE_3__.itemAxisPredicate);
var selectPolarItemsSettings = (0,reselect__WEBPACK_IMPORTED_MODULE_0__.createSelector)([selectUnfilteredPolarItems, _axisSelectors__WEBPACK_IMPORTED_MODULE_3__.selectBaseAxis, selectAxisPredicate], _axisSelectors__WEBPACK_IMPORTED_MODULE_3__.combineGraphicalItemsSettings);
var selectPolarGraphicalItemsData = (0,reselect__WEBPACK_IMPORTED_MODULE_0__.createSelector)([selectPolarItemsSettings], _axisSelectors__WEBPACK_IMPORTED_MODULE_3__.combineGraphicalItemsData);
var selectPolarDisplayedData = (0,reselect__WEBPACK_IMPORTED_MODULE_0__.createSelector)([selectPolarGraphicalItemsData, _dataSelectors__WEBPACK_IMPORTED_MODULE_4__.selectChartDataAndAlwaysIgnoreIndexes], _axisSelectors__WEBPACK_IMPORTED_MODULE_3__.combineDisplayedData);
var selectPolarAppliedValues = (0,reselect__WEBPACK_IMPORTED_MODULE_0__.createSelector)([selectPolarDisplayedData, _axisSelectors__WEBPACK_IMPORTED_MODULE_3__.selectBaseAxis, selectPolarItemsSettings], _axisSelectors__WEBPACK_IMPORTED_MODULE_3__.combineAppliedValues);
var selectAllPolarAppliedNumericalValues = (0,reselect__WEBPACK_IMPORTED_MODULE_0__.createSelector)([selectPolarDisplayedData, _axisSelectors__WEBPACK_IMPORTED_MODULE_3__.selectBaseAxis, selectPolarItemsSettings], (data, axisSettings, items) => {
  if (items.length > 0) {
    return data.flatMap(entry => {
      return items.flatMap(item => {
        var _axisSettings$dataKey;
        var valueByDataKey = (0,_util_ChartUtils__WEBPACK_IMPORTED_MODULE_5__.getValueByDataKey)(entry, (_axisSettings$dataKey = axisSettings.dataKey) !== null && _axisSettings$dataKey !== void 0 ? _axisSettings$dataKey : item.dataKey);
        return {
          value: valueByDataKey,
          errorDomain: [] // polar charts do not have error bars
        };
      });
    }).filter(Boolean);
  }
  if ((axisSettings === null || axisSettings === void 0 ? void 0 : axisSettings.dataKey) != null) {
    return data.map(item => ({
      value: (0,_util_ChartUtils__WEBPACK_IMPORTED_MODULE_5__.getValueByDataKey)(item, axisSettings.dataKey),
      errorDomain: []
    }));
  }
  return data.map(entry => ({
    value: entry,
    errorDomain: []
  }));
});
var unsupportedInPolarChart = () => undefined;
var selectDomainOfAllPolarAppliedNumericalValues = (0,reselect__WEBPACK_IMPORTED_MODULE_0__.createSelector)([selectPolarDisplayedData, _axisSelectors__WEBPACK_IMPORTED_MODULE_3__.selectBaseAxis, selectPolarItemsSettings, _axisSelectors__WEBPACK_IMPORTED_MODULE_3__.selectAllErrorBarSettings, _pickAxisType__WEBPACK_IMPORTED_MODULE_1__.pickAxisType, _dataSelectors__WEBPACK_IMPORTED_MODULE_4__.selectChartDataSliceIgnoringIndexes], _axisSelectors__WEBPACK_IMPORTED_MODULE_3__.combineDomainOfAllAppliedNumericalValuesIncludingErrorValues);
var selectPolarNumericalDomain = (0,reselect__WEBPACK_IMPORTED_MODULE_0__.createSelector)([_axisSelectors__WEBPACK_IMPORTED_MODULE_3__.selectBaseAxis, _axisSelectors__WEBPACK_IMPORTED_MODULE_3__.selectDomainDefinition, _axisSelectors__WEBPACK_IMPORTED_MODULE_3__.selectDomainFromUserPreference, unsupportedInPolarChart, selectDomainOfAllPolarAppliedNumericalValues, unsupportedInPolarChart, _context_chartLayoutContext__WEBPACK_IMPORTED_MODULE_6__.selectChartLayout, _pickAxisType__WEBPACK_IMPORTED_MODULE_1__.pickAxisType], _axisSelectors__WEBPACK_IMPORTED_MODULE_3__.combineNumericalDomain);
var selectPolarAxisDomain = (0,reselect__WEBPACK_IMPORTED_MODULE_0__.createSelector)([_axisSelectors__WEBPACK_IMPORTED_MODULE_3__.selectBaseAxis, _context_chartLayoutContext__WEBPACK_IMPORTED_MODULE_6__.selectChartLayout, selectPolarDisplayedData, selectPolarAppliedValues, _rootPropsSelectors__WEBPACK_IMPORTED_MODULE_7__.selectStackOffsetType, _pickAxisType__WEBPACK_IMPORTED_MODULE_1__.pickAxisType, selectPolarNumericalDomain], _axisSelectors__WEBPACK_IMPORTED_MODULE_3__.combineAxisDomain);
var selectPolarNiceTicks = (0,reselect__WEBPACK_IMPORTED_MODULE_0__.createSelector)([selectPolarAxisDomain, _axisSelectors__WEBPACK_IMPORTED_MODULE_3__.selectRenderableAxisSettings, _axisSelectors__WEBPACK_IMPORTED_MODULE_3__.selectRealScaleType], _axisSelectors__WEBPACK_IMPORTED_MODULE_3__.combineNiceTicks);
var selectPolarAxisDomainIncludingNiceTicks = (0,reselect__WEBPACK_IMPORTED_MODULE_0__.createSelector)([_axisSelectors__WEBPACK_IMPORTED_MODULE_3__.selectBaseAxis, selectPolarAxisDomain, selectPolarNiceTicks, _pickAxisType__WEBPACK_IMPORTED_MODULE_1__.pickAxisType], _axisSelectors__WEBPACK_IMPORTED_MODULE_3__.combineAxisDomainWithNiceTicks);
var selectPolarAxisCheckedDomain = (0,reselect__WEBPACK_IMPORTED_MODULE_0__.createSelector)([_axisSelectors__WEBPACK_IMPORTED_MODULE_3__.selectRealScaleType, selectPolarAxisDomainIncludingNiceTicks], _combiners_combineCheckedDomain__WEBPACK_IMPORTED_MODULE_8__.combineCheckedDomain);

/***/ })

}]);