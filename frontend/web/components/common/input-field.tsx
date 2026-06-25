export default function InputField({
  id,
  type,
  icon: Icon,
  placeholder,
  error,
  value,
  onChange,
  rightIcon,
  onRightClick,
}: any) {
  return (
    <div className="space-y-1">
      <div
        className={`flex h-12 items-center gap-3 rounded-2xl border bg-slate-50/80 px-4 transition
        ${
          error
            ? "border-red-500 bg-red-50/40"
            : "border-slate-200 hover:border-slate-300 focus-within:border-[var(--color-primary)]"
        }`}
      >
        <Icon className="h-4 w-4 text-slate-400 shrink-0" />

        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="h-full w-full bg-transparent text-sm outline-none"
        />

        {rightIcon && (
          <button
            type="button"
            onClick={onRightClick}
            className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            {rightIcon}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
