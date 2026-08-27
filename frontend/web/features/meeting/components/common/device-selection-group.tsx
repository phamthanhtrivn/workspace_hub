interface DeviceSelectionGroupProps {
  title: string;
  emptyLabel: string;
  devices: Array<{
    deviceId: string;
    label: string;
  }>;
  selectedDeviceId: string;
  onSelect: (deviceId: string) => void;
}

export function DeviceSelectionGroup({
  title,
  emptyLabel,
  devices,
  selectedDeviceId,
  onSelect,
}: DeviceSelectionGroupProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-black uppercase text-slate-500">{title}</p>

      {devices.length ? (
        <div className="space-y-2">
          {devices.map((device) => {
            const selected = device.deviceId === selectedDeviceId;

            return (
              <button
                key={device.deviceId}
                type="button"
                onClick={() => onSelect(device.deviceId)}
                className={`flex min-h-9 w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-bold transition ${
                  selected
                    ? "border-blue-300 bg-blue-50 text-slate-900 ring-1 ring-blue-300"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                    selected
                      ? "border-blue-500 bg-blue-500"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {selected ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  ) : null}
                </span>
                <span className="min-w-0 truncate">{device.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-500">
          {emptyLabel}
        </p>
      )}
    </div>
  );
}
