import type { WeatherCondition } from "../../types/dashboard-weather.types";

const CLOUD = "fill-slate-100 stroke-slate-500 dark:fill-slate-600 dark:stroke-slate-300";
const RAIN = "fill-sky-600 stroke-sky-700 dark:fill-sky-400 dark:stroke-sky-300";
const ICE = "stroke-sky-700 dark:stroke-sky-300";

function Sunlight({ x = 32, y = 25 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="stroke-amber-600 dark:stroke-amber-300">
        <path d="M0-20v-5M0 20v5M-20 0h-5M20 0h5M-14-14l-4-4M14 14l4 4M-14 14l-4 4M14-14l4-4" />
      </g>
      <circle r="13" className="fill-amber-300 stroke-amber-600 dark:fill-amber-400 dark:stroke-amber-300" />
    </g>
  );
}

function Moonlight({ x = 32, y = 25 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M7-17A18 18 0 1 0 17 9 19 19 0 0 1 7-17Z"
        className="fill-indigo-200 stroke-indigo-600 dark:fill-indigo-300 dark:stroke-indigo-200" />
      <path d="M21-16v6m-3-3h6M-13-22v4m-2-2h4" className="stroke-indigo-500 dark:stroke-indigo-200" />
    </g>
  );
}

function WeatherCloud({ storm = false }: { storm?: boolean }) {
  return <path d="M26 51a12 12 0 0 1-1-24 18 18 0 0 1 34-4 14 14 0 0 1 6 0 14 14 0 0 1 3 28Z"
    className={storm ? "fill-slate-500 stroke-slate-700 dark:fill-slate-500 dark:stroke-slate-200" : CLOUD} />;
}

function Snowflake({ x, y }: { x: number; y: number }) {
  return <path transform={`translate(${x} ${y})`} d="M0-5v10M-4.3-2.5l8.6 5M-4.3 2.5l8.6-5" className={ICE} />;
}

/** Decorative illustration; the adjacent condition text supplies its accessible name. */
export function DashboardWeatherIcon({ condition, isDay }: { condition: WeatherCondition; isDay: boolean }) {
  const { symbol, intensity } = condition;
  const mostlyClear = symbol === "mostly-clear";
  const celestial = mostlyClear || symbol === "partly-cloudy" || symbol === "rain-showers" || symbol === "snow-showers";
  const fog = symbol === "fog" || symbol === "freezing-fog";
  const freezing = symbol === "freezing-rain" || symbol === "freezing-drizzle";
  const drizzle = symbol === "drizzle" || symbol === "freezing-drizzle";
  const rain = symbol === "rain" || symbol === "rain-showers" || freezing;
  const snow = symbol === "snow" || symbol === "snow-showers";
  const storm = symbol === "storm" || symbol === "hail";
  // Keep precipitation separated at this small size; density conveys intensity too.
  const positions = intensity === 1 ? [43] : intensity === 2 ? [32, 56] : [27, 45, 63];

  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 96 80" className="h-20 w-20 shrink-0 overflow-visible sm:w-24"
      fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {symbol === "clear" ? (isDay ? <Sunlight x={48} y={39} /> : <Moonlight x={46} y={40} />) : <>
        {celestial ? (isDay ? <Sunlight /> : <Moonlight />) : null}
        {symbol === "cloudy" ? <g transform="translate(15 -4) scale(.82)" opacity=".65"><WeatherCloud /></g> : null}
        <g transform={mostlyClear ? "translate(32 23) scale(.65)" : undefined}><WeatherCloud storm={storm} /></g>
        {fog ? <g className="stroke-slate-500 dark:stroke-slate-300">
          <path d="M17 58h48M28 65h48M20 72h39" />
          {symbol === "freezing-fog" ? <Snowflake x={76} y={57} /> : null}
        </g> : null}
        {drizzle ? positions.map((x) => <g key={x} className={RAIN}>
          <circle cx={x} cy="59" r="1.5" /><circle cx={x - 3} cy="69" r="1.5" />
        </g>) : rain ? positions.map((x) => <path key={x} transform={`translate(${x} 56)`}
          d="M0 0C-1 4-5 7-5 10a3 3 0 0 0 6 0C1 7 0 3 0 0Z" className={RAIN} />) : null}
        {freezing ? <Snowflake x={72} y={64} /> : null}
        {snow ? positions.map((x, index) => <Snowflake key={x} x={x} y={index % 2 ? 70 : 61} />) : null}
        {symbol === "snow-grains" ? <g className="fill-sky-100 stroke-sky-700 dark:fill-sky-200 dark:stroke-sky-300">
          <circle cx="29" cy="61" r="2.5" /><circle cx="48" cy="69" r="2.5" /><circle cx="65" cy="60" r="2.5" />
        </g> : null}
        {storm ? <>
          <path d="M48 45 35 62h10l-5 14 21-23H49l6-8Z"
            className="fill-amber-300 stroke-amber-700 dark:fill-amber-300 dark:stroke-amber-200" />
          {symbol === "hail" ? <g className="fill-sky-100 stroke-sky-700 dark:fill-sky-200 dark:stroke-sky-300">
            <circle cx="25" cy="62" r="3" /><circle cx="69" cy="65" r="3" />
            {intensity === 3 ? <circle cx="64" cy="75" r="3" /> : null}
          </g> : <path d={intensity === 3 ? "M27 57l-4 9m44-9-4 9M23 71l-2 4m47-4-2 4" : "M27 57l-4 9m44-9-4 9"}
            className="stroke-sky-600 dark:stroke-sky-300" />}
        </> : null}
        {symbol === "unknown" ? <g className="stroke-slate-600 dark:stroke-slate-100">
          <path d="M43 32a5 5 0 1 1 7 4c-2 1-3 2-3 4" /><circle cx="47" cy="45" r=".8" />
        </g> : null}
      </>}
    </svg>
  );
}
