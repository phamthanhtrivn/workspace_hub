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
    <label className="block space-y-2">
      <span className="block text-xs font-black uppercase text-slate-500">
        {title}
      </span>
      <select
        value={selectedDeviceId}
        onChange={(event) => onSelect(event.target.value)}
        disabled={!devices.length}
        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:border-dashed disabled:bg-slate-50 disabled:text-slate-500"
      >
        {devices.length ? null : (
          <option value="" disabled>
            {emptyLabel}
          </option>
        )}
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label}
          </option>
        ))}
      </select>
    </label>
  );
}
