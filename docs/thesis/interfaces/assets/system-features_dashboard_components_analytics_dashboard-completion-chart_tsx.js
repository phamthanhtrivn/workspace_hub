"use strict";
(globalThis["webpackChunkweb"] = globalThis["webpackChunkweb"] || []).push([["features_dashboard_components_analytics_dashboard-completion-chart_tsx"],{

/***/ "./features/dashboard/components/analytics/dashboard-completion-chart.tsx":
/*!********************************************************************************!*\
  !*** ./features/dashboard/components/analytics/dashboard-completion-chart.tsx ***!
  \********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ DashboardCompletionChart)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-runtime */ "./node_modules/react/jsx-runtime.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/chart/LineChart.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/cartesian/CartesianGrid.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/cartesian/XAxis.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/cartesian/YAxis.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! recharts */ "./node_modules/recharts/es6/cartesian/Line.js");
/* harmony import */ var _components_ui_chart__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/components/ui/chart */ "./components/ui/chart.tsx");
/* harmony import */ var _constants_dashboard_chart_config__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../constants/dashboard-chart-config */ "./features/dashboard/constants/dashboard-chart-config.ts");
"use client";




function DashboardCompletionChart({ days }) {
    return ((0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_chart__WEBPACK_IMPORTED_MODULE_1__.ChartContainer, { config: _constants_dashboard_chart_config__WEBPACK_IMPORTED_MODULE_2__.COMPLETION_CHART_CONFIG, className: "h-36 w-full @min-[320px]/dashboard:h-44 @min-[640px]/dashboard:h-60", role: "group", "aria-label": `Daily completed tasks over the last ${days.length} days`, children: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)(recharts__WEBPACK_IMPORTED_MODULE_3__.LineChart, { data: days, margin: { top: 16, right: 16, left: -20, bottom: 0 }, accessibilityLayer: true, children: [(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(recharts__WEBPACK_IMPORTED_MODULE_4__.CartesianGrid, { vertical: false, strokeDasharray: "3 4" }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(recharts__WEBPACK_IMPORTED_MODULE_5__.XAxis, { dataKey: "date", axisLine: false, tickLine: false, tickMargin: 12, minTickGap: 32, tickFormatter: (date) => days.find((day) => day.date === date)?.label ?? date }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(recharts__WEBPACK_IMPORTED_MODULE_6__.YAxis, { allowDecimals: false, axisLine: false, tickLine: false, tickMargin: 8, domain: [0, (maximum) => Math.max(1, maximum)] }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_chart__WEBPACK_IMPORTED_MODULE_1__.ChartTooltip, { cursor: { stroke: "var(--border)", strokeDasharray: "3 4" }, isAnimationActive: false, content: (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(_components_ui_chart__WEBPACK_IMPORTED_MODULE_1__.ChartTooltipContent, { indicator: "line" }) }), (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(recharts__WEBPACK_IMPORTED_MODULE_7__.Line, { type: "monotone", dataKey: "count", stroke: "var(--color-count)", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round", dot: days.length <= 7 ? { r: 3, fill: "var(--card)", strokeWidth: 2 } : false, activeDot: { r: 5, fill: "var(--color-count)", stroke: "var(--card)", strokeWidth: 2 }, isAnimationActive: false })] }) }));
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

/***/ "./node_modules/recharts/es6/cartesian/Line.js":
/*!*****************************************************!*\
  !*** ./node_modules/recharts/es6/cartesian/Line.js ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Line: () => (/* binding */ Line),
/* harmony export */   computeLinePoints: () => (/* binding */ computeLinePoints),
/* harmony export */   defaultLineProps: () => (/* binding */ defaultLineProps)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var clsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! clsx */ "./node_modules/clsx/dist/clsx.mjs");
/* harmony import */ var _container_Layer__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ../container/Layer */ "./node_modules/recharts/es6/container/Layer.js");
/* harmony import */ var _LineDrawShape__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./LineDrawShape */ "./node_modules/recharts/es6/cartesian/LineDrawShape.js");
/* harmony import */ var _useAnimatedLineLength__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./useAnimatedLineLength */ "./node_modules/recharts/es6/cartesian/useAnimatedLineLength.js");
/* harmony import */ var _component_LabelList__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../component/LabelList */ "./node_modules/recharts/es6/component/LabelList.js");
/* harmony import */ var _component_Dots__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../component/Dots */ "./node_modules/recharts/es6/component/Dots.js");
/* harmony import */ var _util_DataUtils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/DataUtils */ "./node_modules/recharts/es6/util/DataUtils.js");
/* harmony import */ var _util_ReactUtils__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ../util/ReactUtils */ "./node_modules/recharts/es6/util/ReactUtils.js");
/* harmony import */ var _util_ChartUtils__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../util/ChartUtils */ "./node_modules/recharts/es6/util/ChartUtils.js");
/* harmony import */ var _component_ActivePoints__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ../component/ActivePoints */ "./node_modules/recharts/es6/component/ActivePoints.js");
/* harmony import */ var _state_SetTooltipEntrySettings__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../state/SetTooltipEntrySettings */ "./node_modules/recharts/es6/state/SetTooltipEntrySettings.js");
/* harmony import */ var _context_ErrorBarContext__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ../context/ErrorBarContext */ "./node_modules/recharts/es6/context/ErrorBarContext.js");
/* harmony import */ var _GraphicalItemClipPath__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ./GraphicalItemClipPath */ "./node_modules/recharts/es6/cartesian/GraphicalItemClipPath.js");
/* harmony import */ var _context_chartLayoutContext__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(/*! ../context/chartLayoutContext */ "./node_modules/recharts/es6/context/chartLayoutContext.js");
/* harmony import */ var _context_PanoramaContext__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(/*! ../context/PanoramaContext */ "./node_modules/recharts/es6/context/PanoramaContext.js");
/* harmony import */ var _state_selectors_lineSelectors__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(/*! ../state/selectors/lineSelectors */ "./node_modules/recharts/es6/state/selectors/lineSelectors.js");
/* harmony import */ var _state_hooks__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(/*! ../state/hooks */ "./node_modules/recharts/es6/state/hooks.js");
/* harmony import */ var _state_SetLegendPayload__WEBPACK_IMPORTED_MODULE_29__ = __webpack_require__(/*! ../state/SetLegendPayload */ "./node_modules/recharts/es6/state/SetLegendPayload.js");
/* harmony import */ var _animation_AnimatedItems__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../animation/AnimatedItems */ "./node_modules/recharts/es6/animation/AnimatedItems.js");
/* harmony import */ var _animation_matchBy__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../animation/matchBy */ "./node_modules/recharts/es6/animation/matchBy.js");
/* harmony import */ var _util_resolveDefaultProps__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! ../util/resolveDefaultProps */ "./node_modules/recharts/es6/util/resolveDefaultProps.js");
/* harmony import */ var _hooks__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! ../hooks */ "./node_modules/recharts/es6/hooks.js");
/* harmony import */ var _context_RegisterGraphicalItemId__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(/*! ../context/RegisterGraphicalItemId */ "./node_modules/recharts/es6/context/RegisterGraphicalItemId.js");
/* harmony import */ var _state_SetGraphicalItem__WEBPACK_IMPORTED_MODULE_30__ = __webpack_require__(/*! ../state/SetGraphicalItem */ "./node_modules/recharts/es6/state/SetGraphicalItem.js");
/* harmony import */ var _util_svgPropertiesNoEvents__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../util/svgPropertiesNoEvents */ "./node_modules/recharts/es6/util/svgPropertiesNoEvents.js");
/* harmony import */ var _util_svgPropertiesAndEvents__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../util/svgPropertiesAndEvents */ "./node_modules/recharts/es6/util/svgPropertiesAndEvents.js");
/* harmony import */ var _util_getRadiusAndStrokeWidthFromDot__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ../util/getRadiusAndStrokeWidthFromDot */ "./node_modules/recharts/es6/util/getRadiusAndStrokeWidthFromDot.js");
/* harmony import */ var _util_ActiveShapeUtils__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../util/ActiveShapeUtils */ "./node_modules/recharts/es6/util/ActiveShapeUtils.js");
/* harmony import */ var _zIndex_ZIndexLayer__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ../zIndex/ZIndexLayer */ "./node_modules/recharts/es6/zIndex/ZIndexLayer.js");
/* harmony import */ var _zIndex_DefaultZIndexes__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../zIndex/DefaultZIndexes */ "./node_modules/recharts/es6/zIndex/DefaultZIndexes.js");
/* harmony import */ var _util_propsAreEqual__WEBPACK_IMPORTED_MODULE_31__ = __webpack_require__(/*! ../util/propsAreEqual */ "./node_modules/recharts/es6/util/propsAreEqual.js");
var _excluded = ["id"],
  _excluded2 = ["type", "layout", "connectNulls", "needClip", "shape", "strokeDasharray"],
  _excluded3 = ["activeDot", "animateNewValues", "animationBegin", "animationDuration", "animationEasing", "connectNulls", "dot", "hide", "isAnimationActive", "label", "legendType", "xAxisId", "yAxisId", "id"];
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }


































/**
 * Internal props, combination of external props + defaultProps + private Recharts state
 */

/**
 * External props, intended for end users to fill in
 */

function getTotalLength(mainCurve) {
  try {
    return mainCurve && mainCurve.getTotalLength && mainCurve.getTotalLength() || 0;
  } catch (_unused) {
    return 0;
  }
}

/**
 * Compute the average x-shift between matched pairs (prev → next).
 * This tells us the overall direction and magnitude of the data movement.
 */
function averageShift(items) {
  var total = 0;
  var count = 0;
  for (var item of items) {
    if (item.status === 'matched' && item.prev.x != null && item.next.x != null) {
      total += item.next.x - item.prev.x;
      count++;
    }
  }
  return count > 0 ? total / count : 0;
}
var defaultLineAnimateItems = (items, animationElapsedTime) => {
  if (items == null) {
    // First render: return empty, stroke-dasharray handles the reveal
    return [];
  }
  // At animationElapsedTime=1 return only the non-removed items
  if (animationElapsedTime === 1) return items.flatMap(item => item.status === 'removed' ? [] : [item.next]);
  var shift = averageShift(items);
  var result = [];
  for (var item of items) {
    if (item.status === 'matched') {
      result.push(_objectSpread(_objectSpread({}, item.next), {}, {
        x: (0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_2__.interpolate)(item.prev.x, item.next.x, animationElapsedTime),
        y: (0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_2__.interpolate)(item.prev.y, item.next.y, animationElapsedTime)
      }));
    } else if (item.status === 'added') {
      if (item.next.x != null) {
        // Extrapolate entry position: the point starts where it "would have been"
        var entryX = item.next.x - shift;
        result.push(_objectSpread(_objectSpread({}, item.next), {}, {
          x: (0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_2__.interpolate)(entryX, item.next.x, animationElapsedTime),
          y: item.next.y
        }));
      } else {
        result.push(item.next);
      }
    } else if (item.status === 'removed') {
      if (item.prev.x != null) {
        var exitX = item.prev.x + shift;
        result.push(_objectSpread(_objectSpread({}, item.prev), {}, {
          x: (0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_2__.interpolate)(item.prev.x, exitX, animationElapsedTime),
          y: item.prev.y
        }));
      }
      // else: removed items are simply dropped
    }
  }
  return result;
};
var defaultLineProps = {
  activeDot: true,
  animateNewValues: true,
  animationBegin: 0,
  animationDuration: 1500,
  animationEasing: 'ease',
  animationInterpolateFn: defaultLineAnimateItems,
  animationMatchBy: _animation_matchBy__WEBPACK_IMPORTED_MODULE_3__.matchByIndex,
  connectNulls: false,
  dot: true,
  fill: '#fff',
  hide: false,
  isAnimationActive: 'auto',
  label: false,
  legendType: 'line',
  shape: _LineDrawShape__WEBPACK_IMPORTED_MODULE_4__.LineDrawShape,
  stroke: '#3182bd',
  strokeWidth: 1,
  xAxisId: 0,
  yAxisId: 0,
  zIndex: _zIndex_DefaultZIndexes__WEBPACK_IMPORTED_MODULE_5__.DefaultZIndexes.line,
  type: 'linear'
};

/**
 * Because of naming conflict, we are forced to ignore certain (valid) SVG attributes.
 */

var computeLegendPayloadFromAreaData = props => {
  var dataKey = props.dataKey,
    name = props.name,
    stroke = props.stroke,
    legendType = props.legendType,
    hide = props.hide;
  return [{
    inactive: hide,
    dataKey,
    type: legendType,
    color: stroke,
    value: (0,_util_ChartUtils__WEBPACK_IMPORTED_MODULE_6__.getTooltipNameProp)(name, dataKey),
    payload: props
  }];
};
var SetLineTooltipEntrySettings = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.memo(_ref => {
  var dataKey = _ref.dataKey,
    data = _ref.data,
    stroke = _ref.stroke,
    strokeWidth = _ref.strokeWidth,
    fill = _ref.fill,
    name = _ref.name,
    hide = _ref.hide,
    unit = _ref.unit,
    formatter = _ref.formatter,
    tooltipType = _ref.tooltipType,
    id = _ref.id;
  var tooltipEntrySettings = {
    dataDefinedOnItem: data,
    getPosition: _util_DataUtils__WEBPACK_IMPORTED_MODULE_2__.noop,
    settings: {
      stroke,
      strokeWidth,
      fill,
      dataKey,
      nameKey: undefined,
      name: (0,_util_ChartUtils__WEBPACK_IMPORTED_MODULE_6__.getTooltipNameProp)(name, dataKey),
      hide,
      type: tooltipType,
      color: stroke,
      unit,
      formatter,
      graphicalItemId: id
    }
  };
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_state_SetTooltipEntrySettings__WEBPACK_IMPORTED_MODULE_7__.SetTooltipEntrySettings, {
    tooltipEntrySettings: tooltipEntrySettings
  });
});
function LineDotsWrapper(_ref2) {
  var clipPathId = _ref2.clipPathId,
    points = _ref2.points,
    props = _ref2.props;
  var dot = props.dot,
    dataKey = props.dataKey,
    needClip = props.needClip;

  /*
   * Exclude ID from the props passed to the Dots component
   * because then the ID would be applied to multiple dots, and it would no longer be unique.
   */
  var id = props.id,
    propsWithoutId = _objectWithoutProperties(props, _excluded);
  var lineProps = (0,_util_svgPropertiesNoEvents__WEBPACK_IMPORTED_MODULE_8__.svgPropertiesNoEvents)(propsWithoutId);
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_component_Dots__WEBPACK_IMPORTED_MODULE_9__.Dots, {
    points: points,
    dot: dot,
    className: "recharts-line-dots",
    dotClassName: "recharts-line-dot",
    dataKey: dataKey,
    baseProps: lineProps,
    needClip: needClip,
    clipPathId: clipPathId
  });
}
function LineLabelListProvider(_ref3) {
  var showLabels = _ref3.showLabels,
    children = _ref3.children,
    points = _ref3.points;
  var labelListEntries = (0,react__WEBPACK_IMPORTED_MODULE_0__.useMemo)(() => {
    return points === null || points === void 0 ? void 0 : points.map(point => {
      var _point$x, _point$y;
      var viewBox = {
        x: (_point$x = point.x) !== null && _point$x !== void 0 ? _point$x : 0,
        y: (_point$y = point.y) !== null && _point$y !== void 0 ? _point$y : 0,
        width: 0,
        lowerWidth: 0,
        upperWidth: 0,
        height: 0
      };
      return _objectSpread(_objectSpread({}, viewBox), {}, {
        value: point.value,
        payload: point.payload,
        viewBox,
        /*
         * Line is not passing parentViewBox to the LabelList so the labels can escape - looks like a bug, should we pass parentViewBox?
         * Or should this just be the root chart viewBox?
         */
        parentViewBox: undefined,
        fill: undefined
      });
    });
  }, [points]);
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_component_LabelList__WEBPACK_IMPORTED_MODULE_10__.CartesianLabelListContextProvider, {
    value: showLabels ? labelListEntries : undefined
  }, children);
}
function StaticCurve(_ref4) {
  var clipPathId = _ref4.clipPathId,
    pathRef = _ref4.pathRef,
    points = _ref4.points,
    props = _ref4.props,
    animationElapsedTime = _ref4.animationElapsedTime,
    isAnimating = _ref4.isAnimating,
    isEntrance = _ref4.isEntrance,
    visibleLength = _ref4.visibleLength;
  var type = props.type,
    layout = props.layout,
    connectNulls = props.connectNulls,
    needClip = props.needClip,
    shape = props.shape,
    strokeDasharray = props.strokeDasharray,
    others = _objectWithoutProperties(props, _excluded2);
  var curveProps = _objectSpread(_objectSpread({}, (0,_util_svgPropertiesAndEvents__WEBPACK_IMPORTED_MODULE_11__.svgPropertiesAndEvents)(others)), {}, {
    fill: 'none',
    className: 'recharts-line-curve',
    clipPath: needClip ? "url(#clipPath-".concat(clipPathId, ")") : undefined,
    points,
    type,
    layout,
    connectNulls,
    strokeDasharray: strokeDasharray !== null && strokeDasharray !== void 0 ? strokeDasharray : props.strokeDasharray,
    pathRef,
    animationElapsedTime,
    isAnimating,
    isEntrance: props.animateNewValues ? isEntrance : false,
    visibleLength
  });
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, (points === null || points === void 0 ? void 0 : points.length) > 1 && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_util_ActiveShapeUtils__WEBPACK_IMPORTED_MODULE_12__.Shape, {
    option: shape,
    DefaultShape: defaultLineProps.shape,
    shapeProps: curveProps
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(LineDotsWrapper, {
    points: points,
    clipPathId: clipPathId,
    props: props
  }));
}
function CurveWithAnimation(_ref5) {
  var clipPathId = _ref5.clipPathId,
    props = _ref5.props,
    pathRef = _ref5.pathRef,
    previousPointsRef = _ref5.previousPointsRef;
  var points = props.points,
    isAnimationActive = props.isAnimationActive,
    animationBegin = props.animationBegin,
    animationDuration = props.animationDuration,
    animationEasing = props.animationEasing,
    animationMatchBy = props.animationMatchBy,
    animationInterpolateFn = props.animationInterpolateFn,
    layout = props.layout;
  var totalLength = getTotalLength(pathRef.current);
  var _useAnimationCallback = (0,_animation_AnimatedItems__WEBPACK_IMPORTED_MODULE_13__.useAnimationCallbacks)(props.onAnimationStart, props.onAnimationEnd),
    isAnimating = _useAnimationCallback.isAnimating,
    handleAnimationStart = _useAnimationCallback.handleAnimationStart,
    handleAnimationEnd = _useAnimationCallback.handleAnimationEnd;
  var showLabels = !isAnimating;
  var getVisibleLength = (0,_useAnimatedLineLength__WEBPACK_IMPORTED_MODULE_14__.useAnimatedLineLength)(points);

  // Guard for totalLength: don't update previousPointsRef before SVG path is measured
  var shouldUpdatePreviousRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(animationElapsedTime => animationElapsedTime > 0 && totalLength > 0, [totalLength]);
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(LineLabelListProvider, {
    points: points,
    showLabels: showLabels
  }, props.children, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_animation_AnimatedItems__WEBPACK_IMPORTED_MODULE_13__.AnimatedItems, {
    animationInput: points,
    animationIdPrefix: "recharts-line-",
    items: points,
    previousItemsRef: previousPointsRef,
    isAnimationActive: isAnimationActive,
    animationBegin: animationBegin,
    animationDuration: animationDuration,
    animationEasing: animationEasing,
    onAnimationStart: handleAnimationStart,
    onAnimationEnd: handleAnimationEnd,
    animationInterpolateFn: animationInterpolateFn,
    animationMatchBy: animationMatchBy,
    shouldUpdatePreviousRef: shouldUpdatePreviousRef,
    layout: layout
  }, (stepData, animationElapsedTime, isEntrance) => {
    var animationActive = isAnimating || animationElapsedTime < 1;
    var visibleLength = animationActive ? getVisibleLength(animationElapsedTime, totalLength) : null;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(StaticCurve, {
      props: props,
      points: stepData,
      clipPathId: clipPathId,
      pathRef: pathRef,
      animationElapsedTime: animationElapsedTime,
      isAnimating: animationActive,
      isEntrance: isEntrance,
      visibleLength: visibleLength
    });
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_component_LabelList__WEBPACK_IMPORTED_MODULE_10__.LabelListFromLabelProp, {
    label: props.label
  }));
}
function RenderCurve(_ref6) {
  var clipPathId = _ref6.clipPathId,
    props = _ref6.props;
  var previousPointsRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  var pathRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(null);
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(CurveWithAnimation, {
    props: props,
    clipPathId: clipPathId,
    previousPointsRef: previousPointsRef,
    pathRef: pathRef
  });
}
var errorBarDataPointFormatter = (dataPoint, dataKey) => {
  var _dataPoint$x, _dataPoint$y;
  return {
    x: (_dataPoint$x = dataPoint.x) !== null && _dataPoint$x !== void 0 ? _dataPoint$x : undefined,
    y: (_dataPoint$y = dataPoint.y) !== null && _dataPoint$y !== void 0 ? _dataPoint$y : undefined,
    value: dataPoint.value,
    // getValueByDataKey does not validate the output type
    errorVal: (0,_util_ChartUtils__WEBPACK_IMPORTED_MODULE_6__.getValueByDataKey)(dataPoint.payload, dataKey)
  };
};

// eslint-disable-next-line react/prefer-stateless-function
class LineWithState extends react__WEBPACK_IMPORTED_MODULE_0__.Component {
  render() {
    var _this$props = this.props,
      hide = _this$props.hide,
      dot = _this$props.dot,
      points = _this$props.points,
      className = _this$props.className,
      xAxisId = _this$props.xAxisId,
      yAxisId = _this$props.yAxisId,
      top = _this$props.top,
      left = _this$props.left,
      width = _this$props.width,
      height = _this$props.height,
      id = _this$props.id,
      needClip = _this$props.needClip,
      zIndex = _this$props.zIndex;
    if (hide) {
      return null;
    }
    var layerClass = (0,clsx__WEBPACK_IMPORTED_MODULE_1__.clsx)('recharts-line', className);
    var clipPathId = id;
    var _getRadiusAndStrokeWi = (0,_util_getRadiusAndStrokeWidthFromDot__WEBPACK_IMPORTED_MODULE_15__.getRadiusAndStrokeWidthFromDot)(dot),
      r = _getRadiusAndStrokeWi.r,
      strokeWidth = _getRadiusAndStrokeWi.strokeWidth;
    var clipDot = (0,_util_ReactUtils__WEBPACK_IMPORTED_MODULE_16__.isClipDot)(dot);
    var dotSize = r * 2 + strokeWidth;
    var activePointsClipPath = needClip ? "url(#clipPath-".concat(clipDot ? '' : 'dots-').concat(clipPathId, ")") : undefined;
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_zIndex_ZIndexLayer__WEBPACK_IMPORTED_MODULE_17__.ZIndexLayer, {
      zIndex: zIndex
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_container_Layer__WEBPACK_IMPORTED_MODULE_18__.Layer, {
      className: layerClass
    }, needClip && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("defs", null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_GraphicalItemClipPath__WEBPACK_IMPORTED_MODULE_19__.GraphicalItemClipPath, {
      clipPathId: clipPathId,
      xAxisId: xAxisId,
      yAxisId: yAxisId
    }), !clipDot && /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("clipPath", {
      id: "clipPath-dots-".concat(clipPathId)
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("rect", {
      x: left - dotSize / 2,
      y: top - dotSize / 2,
      width: width + dotSize,
      height: height + dotSize
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_context_ErrorBarContext__WEBPACK_IMPORTED_MODULE_20__.SetErrorBarContext, {
      xAxisId: xAxisId,
      yAxisId: yAxisId,
      data: points,
      dataPointFormatter: errorBarDataPointFormatter,
      errorBarOffset: 0
    }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(RenderCurve, {
      props: this.props,
      clipPathId: clipPathId
    }))), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_component_ActivePoints__WEBPACK_IMPORTED_MODULE_21__.ActivePoints, {
      activeDot: this.props.activeDot,
      points: points,
      mainColor: this.props.stroke,
      itemDataKey: this.props.dataKey,
      clipPath: activePointsClipPath
    }));
  }
}
function LineImpl(props) {
  var _resolveDefaultProps = (0,_util_resolveDefaultProps__WEBPACK_IMPORTED_MODULE_22__.resolveDefaultProps)(props, defaultLineProps),
    activeDot = _resolveDefaultProps.activeDot,
    animateNewValues = _resolveDefaultProps.animateNewValues,
    animationBegin = _resolveDefaultProps.animationBegin,
    animationDuration = _resolveDefaultProps.animationDuration,
    animationEasing = _resolveDefaultProps.animationEasing,
    connectNulls = _resolveDefaultProps.connectNulls,
    dot = _resolveDefaultProps.dot,
    hide = _resolveDefaultProps.hide,
    isAnimationActive = _resolveDefaultProps.isAnimationActive,
    label = _resolveDefaultProps.label,
    legendType = _resolveDefaultProps.legendType,
    xAxisId = _resolveDefaultProps.xAxisId,
    yAxisId = _resolveDefaultProps.yAxisId,
    id = _resolveDefaultProps.id,
    everythingElse = _objectWithoutProperties(_resolveDefaultProps, _excluded3);
  var _useNeedsClip = (0,_GraphicalItemClipPath__WEBPACK_IMPORTED_MODULE_19__.useNeedsClip)(xAxisId, yAxisId),
    needClip = _useNeedsClip.needClip;
  var plotArea = (0,_hooks__WEBPACK_IMPORTED_MODULE_23__.usePlotArea)();
  var layout = (0,_context_chartLayoutContext__WEBPACK_IMPORTED_MODULE_24__.useChartLayout)();
  var isPanorama = (0,_context_PanoramaContext__WEBPACK_IMPORTED_MODULE_25__.useIsPanorama)();
  var points = (0,_state_hooks__WEBPACK_IMPORTED_MODULE_26__.useAppSelector)(state => (0,_state_selectors_lineSelectors__WEBPACK_IMPORTED_MODULE_27__.selectLinePoints)(state, xAxisId, yAxisId, isPanorama, id));
  if (layout !== 'horizontal' && layout !== 'vertical' || points == null || plotArea == null) {
    // Cannot render Line in an unsupported layout
    return null;
  }
  var height = plotArea.height,
    width = plotArea.width,
    left = plotArea.x,
    top = plotArea.y;
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(LineWithState, _extends({}, everythingElse, {
    id: id,
    connectNulls: connectNulls,
    dot: dot,
    activeDot: activeDot,
    animateNewValues: animateNewValues,
    animationBegin: animationBegin,
    animationDuration: animationDuration,
    animationEasing: animationEasing,
    isAnimationActive: isAnimationActive,
    hide: hide,
    label: label,
    legendType: legendType,
    xAxisId: xAxisId,
    yAxisId: yAxisId,
    points: points,
    layout: layout,
    height: height,
    width: width,
    left: left,
    top: top,
    needClip: needClip
  }));
}
function computeLinePoints(_ref7) {
  var layout = _ref7.layout,
    xAxis = _ref7.xAxis,
    yAxis = _ref7.yAxis,
    xAxisTicks = _ref7.xAxisTicks,
    yAxisTicks = _ref7.yAxisTicks,
    dataKey = _ref7.dataKey,
    bandSize = _ref7.bandSize,
    displayedData = _ref7.displayedData;
  return displayedData.map((entry, index) => {
    // getValueByDataKey does not validate the output type
    var value = (0,_util_ChartUtils__WEBPACK_IMPORTED_MODULE_6__.getValueByDataKey)(entry, dataKey);
    if (layout === 'horizontal') {
      var _x = (0,_util_ChartUtils__WEBPACK_IMPORTED_MODULE_6__.getCateCoordinateOfLine)({
        axis: xAxis,
        ticks: xAxisTicks,
        bandSize,
        entry,
        index
      });
      var _y = (0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_2__.isNullish)(value) ? null : yAxis.scale.map(value);
      return {
        x: _x,
        y: _y !== null && _y !== void 0 ? _y : null,
        value,
        payload: entry
      };
    }
    var x = (0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_2__.isNullish)(value) ? null : xAxis.scale.map(value);
    var y = (0,_util_ChartUtils__WEBPACK_IMPORTED_MODULE_6__.getCateCoordinateOfLine)({
      axis: yAxis,
      ticks: yAxisTicks,
      bandSize,
      entry,
      index
    });
    if (x == null || y == null) {
      return null;
    }
    return {
      x,
      y,
      value,
      payload: entry
    };
  }).filter(Boolean);
}
function LineFn(outsideProps) {
  var props = (0,_util_resolveDefaultProps__WEBPACK_IMPORTED_MODULE_22__.resolveDefaultProps)(outsideProps, defaultLineProps);
  var isPanorama = (0,_context_PanoramaContext__WEBPACK_IMPORTED_MODULE_25__.useIsPanorama)();
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_context_RegisterGraphicalItemId__WEBPACK_IMPORTED_MODULE_28__.RegisterGraphicalItemId, {
    id: props.id,
    type: "line"
  }, id => /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(react__WEBPACK_IMPORTED_MODULE_0__.Fragment, null, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_state_SetLegendPayload__WEBPACK_IMPORTED_MODULE_29__.SetLegendPayload, {
    legendPayload: computeLegendPayloadFromAreaData(props)
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(SetLineTooltipEntrySettings, {
    dataKey: props.dataKey,
    data: props.data,
    stroke: props.stroke,
    strokeWidth: props.strokeWidth,
    fill: props.fill,
    name: props.name,
    hide: props.hide,
    unit: props.unit,
    formatter: props.formatter,
    tooltipType: props.tooltipType,
    id: id
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_state_SetGraphicalItem__WEBPACK_IMPORTED_MODULE_30__.SetCartesianGraphicalItem, {
    type: "line",
    id: id,
    data: props.data,
    xAxisId: props.xAxisId,
    yAxisId: props.yAxisId,
    zAxisId: 0,
    dataKey: props.dataKey,
    hide: props.hide,
    isPanorama: isPanorama
  }), /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(LineImpl, _extends({}, props, {
    id: id
  }))));
}

/**
 * @provides LabelListContext
 * @provides ErrorBarContext
 * @consumes CartesianChartContext
 */
var Line = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.memo(LineFn, _util_propsAreEqual__WEBPACK_IMPORTED_MODULE_31__.propsAreEqual);
// @ts-expect-error we need to set the displayName for debugging purposes
Line.displayName = 'Line';

/***/ }),

/***/ "./node_modules/recharts/es6/cartesian/LineDrawShape.js":
/*!**************************************************************!*\
  !*** ./node_modules/recharts/es6/cartesian/LineDrawShape.js ***!
  \**************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LineDrawShape: () => (/* binding */ LineDrawShape)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _shape_Curve__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../shape/Curve */ "./node_modules/recharts/es6/shape/Curve.js");
var _excluded = ["animationElapsedTime", "isAnimating", "isEntrance", "visibleLength", "strokeDasharray", "connectNulls"];
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }


/**
 * Reads the total length of an SVG path element, returning 0 if the element
 * is null or the measurement fails (e.g. in JSDOM).
 */
function getTotalLength(path) {
  try {
    return path && path.getTotalLength && path.getTotalLength() || 0;
  } catch (_unused) {
    return 0;
  }
}

/**
 * Generates a simple stroke-dasharray string for animating a line draw effect.
 *
 * Uses `totalLength` as the gap (instead of `totalLength - length`) to prevent a floating-point
 * precision artifact: when fractional dash and gap values are serialized to a string attribute
 * and reparsed by the SVG renderer, their sum can differ from the actual path length by a ULP,
 * causing the dasharray pattern to repeat and render a phantom dot at the path endpoint
 * with round or square strokeLinecap.
 *
 * @param totalLength The total length of the SVG path
 * @param length The currently visible portion of the path
 * @returns A stroke-dasharray string like "50px 200px"
 */
function generateSimpleStrokeDasharray(totalLength, length) {
  return "".concat(length, "px ").concat(totalLength, "px");
}

/**
 * Normalizes a dash pattern to the even-length sequence used by SVG renderers.
 * Odd-length stroke-dasharray values repeat once, so "5" behaves like "5 5".
 *
 * @param lines Array of dash/gap lengths to repeat
 * @returns An even-length dash pattern
 */
function normalizeDashPattern(lines) {
  return lines.length % 2 !== 0 ? [...lines, ...lines] : lines;
}

/**
 * Repeats a dash pattern array a given number of times.
 *
 * @param lines Array of dash/gap lengths to repeat
 * @param count Number of times to repeat the pattern
 * @returns A new array with the pattern repeated `count` times
 */
function repeat(lines, count) {
  var result = [];
  for (var i = 0; i < count; ++i) {
    result.push(...lines);
  }
  return result;
}

/**
 * Computes a stroke-dasharray string for animating a custom-dashed line draw effect.
 *
 * Given a user-specified dash pattern (e.g. `"7,3"`), this function builds a dasharray
 * that reveals exactly `length` pixels of that pattern, followed by a gap of `totalLength`
 * to hide the remainder of the path.
 *
 * Like {@link generateSimpleStrokeDasharray}, the trailing gap uses `totalLength` rather than
 * `totalLength - length` to avoid floating-point precision artifacts with round/square strokeLinecap.
 *
 * @param length The currently visible portion of the path
 * @param totalLength The total length of the SVG path
 * @param lines The user-specified dash pattern as an array of numbers (e.g. [7, 3])
 * @returns A stroke-dasharray string incorporating the custom dash pattern
 */
function getStrokeDasharray(length, totalLength, lines) {
  var normalizedLines = normalizeDashPattern(lines);
  var lineLength = normalizedLines.reduce((pre, next) => pre + next, 0);

  // if lineLength is 0 return the default when no strokeDasharray is provided
  if (!lineLength) {
    return generateSimpleStrokeDasharray(totalLength, length);
  }
  var count = Math.floor(length / lineLength);
  var remainLength = length % lineLength;
  var remainLines = [];
  for (var i = 0, sum = 0; i < normalizedLines.length; sum += (_normalizedLines$i = normalizedLines[i]) !== null && _normalizedLines$i !== void 0 ? _normalizedLines$i : 0, ++i) {
    var _normalizedLines$i;
    var lineValue = normalizedLines[i];
    if (lineValue != null && sum + lineValue > remainLength) {
      remainLines = [...normalizedLines.slice(0, i), remainLength - sum];
      break;
    }
  }
  var emptyLines = remainLines.length % 2 === 0 ? [0, totalLength] : [totalLength];
  return [...repeat(normalizedLines, count), ...remainLines, ...emptyLines].map(line => "".concat(line, "px")).join(', ');
}

/**
 * Computes the animated stroke-dasharray for a line's entrance animation.
 *
 * @param userStrokeDasharray The user-specified stroke-dasharray (e.g. "5,3"), if any
 * @param totalLength Total SVG path length
 * @param visibleLength How much of the path should be visible
 * @returns A stroke-dasharray string for the current animation frame
 */
function computeAnimatedStrokeDasharray(userStrokeDasharray, totalLength, visibleLength) {
  if (userStrokeDasharray) {
    var lines = "".concat(userStrokeDasharray).split(/[,\s]+/gim).map(num => parseFloat(num));
    return getStrokeDasharray(visibleLength, totalLength, lines);
  }
  return generateSimpleStrokeDasharray(totalLength, visibleLength);
}
/**
 * The default shape for Line. During the entrance animation, the line is progressively
 * revealed using the `strokeDasharray` SVG attribute: the visible portion grows from
 * 0 to the full path length as `animationElapsedTime` progresses from 0 to 1.
 *
 * This is the built-in shape for Line. It is automatically used when no custom `shape` prop
 * is provided. You can import and reuse it as a starting point for custom shapes,
 * or use it as a reference for building your own.
 *
 * The animation progress props (`animationElapsedTime`, `isAnimating`, `isEntrance`) are available
 * for custom shapes that want to add their own effects on top.
 *
 * @example
 * ```tsx
 * import { Line, LineDrawShape } from 'recharts';
 *
 * // Use the default shape explicitly (same as providing no shape prop)
 * <Line dataKey="value" shape={LineDrawShape} />
 * ```
 *
 * @see {@link https://recharts.github.io/en-US/guide/animations Animation guide}
 *
 * @since 3.9
 */
function LineDrawShape(props) {
  var _animationElapsedTime = props.animationElapsedTime,
    isAnimating = props.isAnimating,
    isEntrance = props.isEntrance,
    visibleLength = props.visibleLength,
    userStrokeDasharray = props.strokeDasharray,
    connectNulls = props.connectNulls,
    curveProps = _objectWithoutProperties(props, _excluded);
  var finalConnectNulls = connectNulls !== null && connectNulls !== void 0 ? connectNulls : false;
  var strokeDasharray;
  if (visibleLength != null) {
    var _pathRef$current;
    var pathRef = curveProps.pathRef;
    var totalLength = getTotalLength((_pathRef$current = pathRef === null || pathRef === void 0 ? void 0 : pathRef.current) !== null && _pathRef$current !== void 0 ? _pathRef$current : null);
    strokeDasharray = computeAnimatedStrokeDasharray(userStrokeDasharray, totalLength, visibleLength);
  } else if (userStrokeDasharray != null) {
    strokeDasharray = String(userStrokeDasharray);
  }
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_shape_Curve__WEBPACK_IMPORTED_MODULE_1__.Curve, _extends({}, curveProps, {
    connectNulls: finalConnectNulls,
    strokeDasharray: strokeDasharray
  }));
}

/***/ }),

/***/ "./node_modules/recharts/es6/cartesian/useAnimatedLineLength.js":
/*!**********************************************************************!*\
  !*** ./node_modules/recharts/es6/cartesian/useAnimatedLineLength.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   useAnimatedLineLength: () => (/* binding */ useAnimatedLineLength)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _util_round__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/round */ "./node_modules/recharts/es6/util/round.js");



/**
 * Tracks the animated visible length of a Line's SVG path across data changes.
 *
 * Invariants:
 * 1. The visible length only grows (monotonically non-decreasing with animationElapsedTime).
 * 2. The visible length changes continuously — no jumps when data changes mid-animation.
 *    This is achieved by tracking the maximum animated length in pixels and using it
 *    as the starting point for the next animation.
 * 3. Once the line reaches 100% visibility, it never becomes partially visible again.
 *    In that case the hook returns `null`, meaning no animation stroke-dasharray is needed.
 *
 * @param points The current set of points for the line. When this reference changes,
 *   the hook detects a data change and starts a new animation from the current visible length.
 * @returns A stable callback `(animationElapsedTime, totalLength) => number | null` where:
 *   - `animationElapsedTime` is the animation progress (0 to 1)
 *   - `totalLength` is the current total length of the SVG path in pixels
 *   - returns the visible length in pixels, or `null` if the line is fully visible
 */
function useAnimatedLineLength(points) {
  var startingLengthRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(0);
  var maxAnimatedLengthRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(0);
  var reachedFullRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(false);
  var prevPointsRef = (0,react__WEBPACK_IMPORTED_MODULE_0__.useRef)(points);
  if (prevPointsRef.current !== points) {
    startingLengthRef.current = maxAnimatedLengthRef.current;
    prevPointsRef.current = points;
  }

  // The callback is stable (never changes identity) because it only reads from refs.
  // This avoids triggering unnecessary re-renders in consumers.
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.useCallback)((animationElapsedTime, totalLength) => {
    if (reachedFullRef.current) {
      return null;
    }
    var visibleLength = Math.min((0,_util_round__WEBPACK_IMPORTED_MODULE_1__.round)(startingLengthRef.current + animationElapsedTime * totalLength), totalLength);
    if (animationElapsedTime > 0 && totalLength > 0) {
      maxAnimatedLengthRef.current = Math.max(maxAnimatedLengthRef.current, visibleLength);
      if (visibleLength >= totalLength) {
        reachedFullRef.current = true;
        return null;
      }
    }
    return visibleLength;
  }, []);
}

/***/ }),

/***/ "./node_modules/recharts/es6/chart/LineChart.js":
/*!******************************************************!*\
  !*** ./node_modules/recharts/es6/chart/LineChart.js ***!
  \******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LineChart: () => (/* binding */ LineChart)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _state_optionsSlice__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../state/optionsSlice */ "./node_modules/recharts/es6/state/optionsSlice.js");
/* harmony import */ var _CartesianChart__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./CartesianChart */ "./node_modules/recharts/es6/chart/CartesianChart.js");




var allowedTooltipTypes = ['axis'];

/**
 * @consumes ResponsiveContainerContext
 * @provides CartesianViewBoxContext
 * @provides CartesianChartContext
 */
var LineChart = /*#__PURE__*/(0,react__WEBPACK_IMPORTED_MODULE_0__.forwardRef)((props, ref) => {
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_CartesianChart__WEBPACK_IMPORTED_MODULE_1__.CartesianChart, {
    chartName: "LineChart",
    defaultTooltipEventType: "axis",
    validateTooltipEventTypes: allowedTooltipTypes,
    tooltipPayloadSearcher: _state_optionsSlice__WEBPACK_IMPORTED_MODULE_2__.arrayTooltipSearcher,
    categoricalChartProps: props,
    ref: ref
  });
});

/***/ }),

/***/ "./node_modules/recharts/es6/component/ActivePoints.js":
/*!*************************************************************!*\
  !*** ./node_modules/recharts/es6/component/ActivePoints.js ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ActivePoints: () => (/* binding */ ActivePoints)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _util_types__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/types */ "./node_modules/recharts/es6/util/types.js");
/* harmony import */ var _shape_Dot__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../shape/Dot */ "./node_modules/recharts/es6/shape/Dot.js");
/* harmony import */ var _container_Layer__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../container/Layer */ "./node_modules/recharts/es6/container/Layer.js");
/* harmony import */ var _state_hooks__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../state/hooks */ "./node_modules/recharts/es6/state/hooks.js");
/* harmony import */ var _state_selectors_tooltipSelectors__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../state/selectors/tooltipSelectors */ "./node_modules/recharts/es6/state/selectors/tooltipSelectors.js");
/* harmony import */ var _hooks__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../hooks */ "./node_modules/recharts/es6/hooks.js");
/* harmony import */ var _util_DataUtils__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../util/DataUtils */ "./node_modules/recharts/es6/util/DataUtils.js");
/* harmony import */ var _util_svgPropertiesNoEvents__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/svgPropertiesNoEvents */ "./node_modules/recharts/es6/util/svgPropertiesNoEvents.js");
/* harmony import */ var _zIndex_ZIndexLayer__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../zIndex/ZIndexLayer */ "./node_modules/recharts/es6/zIndex/ZIndexLayer.js");
/* harmony import */ var _zIndex_DefaultZIndexes__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../zIndex/DefaultZIndexes */ "./node_modules/recharts/es6/zIndex/DefaultZIndexes.js");
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }












var ActivePoint = _ref => {
  var point = _ref.point,
    childIndex = _ref.childIndex,
    mainColor = _ref.mainColor,
    activeDot = _ref.activeDot,
    dataKey = _ref.dataKey,
    clipPath = _ref.clipPath;
  if (activeDot === false || point.x == null || point.y == null) {
    return null;
  }
  var dotPropsTyped = {
    index: childIndex,
    dataKey,
    cx: point.x,
    cy: point.y,
    r: 4,
    fill: mainColor !== null && mainColor !== void 0 ? mainColor : 'none',
    strokeWidth: 2,
    stroke: '#fff',
    payload: point.payload,
    value: point.value
  };

  // @ts-expect-error svgPropertiesNoEventsFromUnknown(activeDot) is contributing unknown props
  var dotProps = _objectSpread(_objectSpread(_objectSpread({}, dotPropsTyped), (0,_util_svgPropertiesNoEvents__WEBPACK_IMPORTED_MODULE_1__.svgPropertiesNoEventsFromUnknown)(activeDot)), (0,_util_types__WEBPACK_IMPORTED_MODULE_2__.adaptEventHandlers)(activeDot));
  var dot;
  if (/*#__PURE__*/(0,react__WEBPACK_IMPORTED_MODULE_0__.isValidElement)(activeDot)) {
    // @ts-expect-error we're improperly typing events
    dot = /*#__PURE__*/(0,react__WEBPACK_IMPORTED_MODULE_0__.cloneElement)(activeDot, dotProps);
  } else if (typeof activeDot === 'function') {
    dot = activeDot(dotProps);
  } else {
    dot = /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_shape_Dot__WEBPACK_IMPORTED_MODULE_3__.Dot, dotProps);
  }
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_container_Layer__WEBPACK_IMPORTED_MODULE_4__.Layer, {
    className: "recharts-active-dot",
    clipPath: clipPath
  }, dot);
};
function ActivePoints(_ref2) {
  var points = _ref2.points,
    mainColor = _ref2.mainColor,
    activeDot = _ref2.activeDot,
    itemDataKey = _ref2.itemDataKey,
    clipPath = _ref2.clipPath,
    _ref2$zIndex = _ref2.zIndex,
    zIndex = _ref2$zIndex === void 0 ? _zIndex_DefaultZIndexes__WEBPACK_IMPORTED_MODULE_5__.DefaultZIndexes.activeDot : _ref2$zIndex;
  var activeTooltipIndex = (0,_state_hooks__WEBPACK_IMPORTED_MODULE_6__.useAppSelector)(_state_selectors_tooltipSelectors__WEBPACK_IMPORTED_MODULE_7__.selectActiveTooltipIndex);
  var activeDataPoints = (0,_hooks__WEBPACK_IMPORTED_MODULE_8__.useActiveTooltipDataPoints)();
  if (points == null || activeDataPoints == null) {
    return null;
  }
  var activePoint = points.find(p => activeDataPoints.includes(p.payload));
  if ((0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_9__.isNullish)(activePoint)) {
    return null;
  }
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_zIndex_ZIndexLayer__WEBPACK_IMPORTED_MODULE_10__.ZIndexLayer, {
    zIndex: zIndex
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(ActivePoint, {
    point: activePoint,
    childIndex: Number(activeTooltipIndex),
    mainColor: mainColor,
    dataKey: itemDataKey,
    activeDot: activeDot,
    clipPath: clipPath
  }));
}

/***/ }),

/***/ "./node_modules/recharts/es6/component/Dots.js":
/*!*****************************************************!*\
  !*** ./node_modules/recharts/es6/component/Dots.js ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Dots: () => (/* binding */ Dots)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var clsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! clsx */ "./node_modules/clsx/dist/clsx.mjs");
/* harmony import */ var _shape_Dot__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../shape/Dot */ "./node_modules/recharts/es6/shape/Dot.js");
/* harmony import */ var _container_Layer__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../container/Layer */ "./node_modules/recharts/es6/container/Layer.js");
/* harmony import */ var _util_ReactUtils__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../util/ReactUtils */ "./node_modules/recharts/es6/util/ReactUtils.js");
/* harmony import */ var _util_svgPropertiesAndEvents__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../util/svgPropertiesAndEvents */ "./node_modules/recharts/es6/util/svgPropertiesAndEvents.js");
/* harmony import */ var _zIndex_ZIndexLayer__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../zIndex/ZIndexLayer */ "./node_modules/recharts/es6/zIndex/ZIndexLayer.js");
/* harmony import */ var _zIndex_DefaultZIndexes__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../zIndex/DefaultZIndexes */ "./node_modules/recharts/es6/zIndex/DefaultZIndexes.js");
var _excluded = ["points"];
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }









function DotItem(_ref) {
  var option = _ref.option,
    dotProps = _ref.dotProps,
    className = _ref.className;
  if (/*#__PURE__*/(0,react__WEBPACK_IMPORTED_MODULE_0__.isValidElement)(option)) {
    // @ts-expect-error we can't type check element cloning properly
    return /*#__PURE__*/(0,react__WEBPACK_IMPORTED_MODULE_0__.cloneElement)(option, dotProps);
  }
  if (typeof option === 'function') {
    return option(dotProps);
  }
  var finalClassName = (0,clsx__WEBPACK_IMPORTED_MODULE_1__.clsx)(className, typeof option !== 'boolean' ? option.className : '');
  var _ref2 = dotProps !== null && dotProps !== void 0 ? dotProps : {},
    points = _ref2.points,
    props = _objectWithoutProperties(_ref2, _excluded);
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_shape_Dot__WEBPACK_IMPORTED_MODULE_2__.Dot, _extends({}, props, {
    className: finalClassName
  }));
}
function shouldRenderDots(points, dot) {
  if (points == null) {
    return false;
  }
  if (dot) {
    return true;
  }
  return points.length === 1;
}
function Dots(_ref3) {
  var points = _ref3.points,
    dot = _ref3.dot,
    className = _ref3.className,
    dotClassName = _ref3.dotClassName,
    dataKey = _ref3.dataKey,
    baseProps = _ref3.baseProps,
    needClip = _ref3.needClip,
    clipPathId = _ref3.clipPathId,
    _ref3$zIndex = _ref3.zIndex,
    zIndex = _ref3$zIndex === void 0 ? _zIndex_DefaultZIndexes__WEBPACK_IMPORTED_MODULE_3__.DefaultZIndexes.scatter : _ref3$zIndex;
  if (!shouldRenderDots(points, dot)) {
    return null;
  }
  var clipDot = (0,_util_ReactUtils__WEBPACK_IMPORTED_MODULE_4__.isClipDot)(dot);
  var customDotProps = (0,_util_svgPropertiesAndEvents__WEBPACK_IMPORTED_MODULE_5__.svgPropertiesAndEventsFromUnknown)(dot);
  var dots = points.map((entry, i) => {
    var _entry$x, _entry$y;
    var dotProps = _objectSpread(_objectSpread(_objectSpread({
      r: 3
    }, baseProps), customDotProps), {}, {
      index: i,
      cx: (_entry$x = entry.x) !== null && _entry$x !== void 0 ? _entry$x : undefined,
      cy: (_entry$y = entry.y) !== null && _entry$y !== void 0 ? _entry$y : undefined,
      dataKey,
      value: entry.value,
      payload: entry.payload,
      points
    });
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(DotItem, {
      key: "dot-".concat(i),
      option: dot,
      dotProps: dotProps,
      className: dotClassName
    });
  });
  var layerProps = {};
  if (needClip && clipPathId != null) {
    layerProps.clipPath = "url(#clipPath-".concat(clipDot ? '' : 'dots-').concat(clipPathId, ")");
  }
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_zIndex_ZIndexLayer__WEBPACK_IMPORTED_MODULE_6__.ZIndexLayer, {
    zIndex: zIndex
  }, /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement(_container_Layer__WEBPACK_IMPORTED_MODULE_7__.Layer, _extends({
    className: className
  }, layerProps), dots));
}

/***/ }),

/***/ "./node_modules/recharts/es6/shape/Dot.js":
/*!************************************************!*\
  !*** ./node_modules/recharts/es6/shape/Dot.js ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Dot: () => (/* binding */ Dot)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var clsx__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! clsx */ "./node_modules/clsx/dist/clsx.mjs");
/* harmony import */ var _util_types__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../util/types */ "./node_modules/recharts/es6/util/types.js");
/* harmony import */ var _util_svgPropertiesNoEvents__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../util/svgPropertiesNoEvents */ "./node_modules/recharts/es6/util/svgPropertiesNoEvents.js");
/* harmony import */ var _util_DataUtils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/DataUtils */ "./node_modules/recharts/es6/util/DataUtils.js");
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }





/**
 * Renders a dot in the chart.
 *
 * This component accepts X and Y coordinates in pixels.
 * If you need to position the rectangle based on your chart's data,
 * consider using the {@link ReferenceDot} component instead.
 *
 * @param props
 * @constructor
 */
var Dot = props => {
  var cx = props.cx,
    cy = props.cy,
    r = props.r,
    className = props.className;
  var layerClass = (0,clsx__WEBPACK_IMPORTED_MODULE_1__.clsx)('recharts-dot', className);
  if ((0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_2__.isNumber)(cx) && (0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_2__.isNumber)(cy) && (0,_util_DataUtils__WEBPACK_IMPORTED_MODULE_2__.isNumber)(r)) {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_0__.createElement("circle", _extends({}, (0,_util_svgPropertiesNoEvents__WEBPACK_IMPORTED_MODULE_3__.svgPropertiesNoEvents)(props), (0,_util_types__WEBPACK_IMPORTED_MODULE_4__.adaptEventHandlers)(props), {
      className: layerClass,
      cx: cx,
      cy: cy,
      r: r
    }));
  }
  return null;
};

/***/ }),

/***/ "./node_modules/recharts/es6/state/selectors/lineSelectors.js":
/*!********************************************************************!*\
  !*** ./node_modules/recharts/es6/state/selectors/lineSelectors.js ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   selectLinePoints: () => (/* binding */ selectLinePoints)
/* harmony export */ });
/* harmony import */ var reselect__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! reselect */ "./node_modules/reselect/dist/reselect.mjs");
/* harmony import */ var _cartesian_Line__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../cartesian/Line */ "./node_modules/recharts/es6/cartesian/Line.js");
/* harmony import */ var _dataSelectors__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./dataSelectors */ "./node_modules/recharts/es6/state/selectors/dataSelectors.js");
/* harmony import */ var _context_chartLayoutContext__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../context/chartLayoutContext */ "./node_modules/recharts/es6/context/chartLayoutContext.js");
/* harmony import */ var _axisSelectors__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./axisSelectors */ "./node_modules/recharts/es6/state/selectors/axisSelectors.js");
/* harmony import */ var _util_ChartUtils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../util/ChartUtils */ "./node_modules/recharts/es6/util/ChartUtils.js");






var selectXAxisWithScale = (state, xAxisId, _yAxisId, isPanorama) => (0,_axisSelectors__WEBPACK_IMPORTED_MODULE_0__.selectAxisWithScale)(state, 'xAxis', xAxisId, isPanorama);
var selectXAxisTicks = (state, xAxisId, _yAxisId, isPanorama) => (0,_axisSelectors__WEBPACK_IMPORTED_MODULE_0__.selectTicksOfGraphicalItem)(state, 'xAxis', xAxisId, isPanorama);
var selectYAxisWithScale = (state, _xAxisId, yAxisId, isPanorama) => (0,_axisSelectors__WEBPACK_IMPORTED_MODULE_0__.selectAxisWithScale)(state, 'yAxis', yAxisId, isPanorama);
var selectYAxisTicks = (state, _xAxisId, yAxisId, isPanorama) => (0,_axisSelectors__WEBPACK_IMPORTED_MODULE_0__.selectTicksOfGraphicalItem)(state, 'yAxis', yAxisId, isPanorama);
var selectBandSize = (0,reselect__WEBPACK_IMPORTED_MODULE_1__.createSelector)([_context_chartLayoutContext__WEBPACK_IMPORTED_MODULE_2__.selectChartLayout, selectXAxisWithScale, selectYAxisWithScale, selectXAxisTicks, selectYAxisTicks], (layout, xAxis, yAxis, xAxisTicks, yAxisTicks) => {
  if ((0,_util_ChartUtils__WEBPACK_IMPORTED_MODULE_3__.isCategoricalAxis)(layout, 'xAxis')) {
    return (0,_util_ChartUtils__WEBPACK_IMPORTED_MODULE_3__.getBandSizeOfAxis)(xAxis, xAxisTicks, false);
  }
  return (0,_util_ChartUtils__WEBPACK_IMPORTED_MODULE_3__.getBandSizeOfAxis)(yAxis, yAxisTicks, false);
});
var pickLineId = (_state, _xAxisId, _yAxisId, _isPanorama, id) => id;
function isLineSettings(item) {
  return item.type === 'line';
}

/*
 * There is a race condition problem because we read some data from props and some from the state.
 * The state is updated through a dispatch and is one render behind,
 * and so we have this weird one tick render where the displayedData in one selector have the old dataKey
 * but the new dataKey in another selector.
 *
 * So here instead of reading the dataKey from the props, we always read it from the state.
 */
var selectSynchronisedLineSettings = (0,reselect__WEBPACK_IMPORTED_MODULE_1__.createSelector)([_axisSelectors__WEBPACK_IMPORTED_MODULE_0__.selectUnfilteredCartesianItems, pickLineId], (graphicalItems, id) => graphicalItems.filter(isLineSettings).find(x => x.id === id));
var selectLinePoints = (0,reselect__WEBPACK_IMPORTED_MODULE_1__.createSelector)([_context_chartLayoutContext__WEBPACK_IMPORTED_MODULE_2__.selectChartLayout, selectXAxisWithScale, selectYAxisWithScale, selectXAxisTicks, selectYAxisTicks, selectSynchronisedLineSettings, selectBandSize, _dataSelectors__WEBPACK_IMPORTED_MODULE_4__.selectChartDataWithIndexesIfNotInPanoramaPosition4], (layout, xAxis, yAxis, xAxisTicks, yAxisTicks, lineSettings, bandSize, _ref) => {
  var chartData = _ref.chartData,
    dataStartIndex = _ref.dataStartIndex,
    dataEndIndex = _ref.dataEndIndex;
  if (lineSettings == null || xAxis == null || yAxis == null || xAxisTicks == null || yAxisTicks == null || xAxisTicks.length === 0 || yAxisTicks.length === 0 || bandSize == null || layout !== 'horizontal' && layout !== 'vertical') {
    return undefined;
  }
  var dataKey = lineSettings.dataKey,
    data = lineSettings.data;
  var displayedData;
  if (data != null && data.length > 0) {
    displayedData = data;
  } else {
    displayedData = chartData === null || chartData === void 0 ? void 0 : chartData.slice(dataStartIndex, dataEndIndex + 1);
  }
  if (displayedData == null) {
    return undefined;
  }
  return (0,_cartesian_Line__WEBPACK_IMPORTED_MODULE_5__.computeLinePoints)({
    layout,
    xAxis,
    yAxis,
    xAxisTicks,
    yAxisTicks,
    dataKey,
    bandSize,
    displayedData
  });
});

/***/ }),

/***/ "./node_modules/recharts/es6/util/getRadiusAndStrokeWidthFromDot.js":
/*!**************************************************************************!*\
  !*** ./node_modules/recharts/es6/util/getRadiusAndStrokeWidthFromDot.js ***!
  \**************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getRadiusAndStrokeWidthFromDot: () => (/* binding */ getRadiusAndStrokeWidthFromDot)
/* harmony export */ });
/* harmony import */ var _svgPropertiesNoEvents__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./svgPropertiesNoEvents */ "./node_modules/recharts/es6/util/svgPropertiesNoEvents.js");

function getRadiusAndStrokeWidthFromDot(dot) {
  var props = (0,_svgPropertiesNoEvents__WEBPACK_IMPORTED_MODULE_0__.svgPropertiesNoEventsFromUnknown)(dot);
  var defaultR = 3;
  var defaultStrokeWidth = 2;
  if (props != null) {
    var r = props.r,
      strokeWidth = props.strokeWidth;
    var realR = Number(r);
    var realStrokeWidth = Number(strokeWidth);
    if (Number.isNaN(realR) || realR < 0) {
      realR = defaultR;
    }
    if (Number.isNaN(realStrokeWidth) || realStrokeWidth < 0) {
      realStrokeWidth = defaultStrokeWidth;
    }
    return {
      r: realR,
      strokeWidth: realStrokeWidth
    };
  }
  return {
    r: defaultR,
    strokeWidth: defaultStrokeWidth
  };
}

/***/ })

}]);