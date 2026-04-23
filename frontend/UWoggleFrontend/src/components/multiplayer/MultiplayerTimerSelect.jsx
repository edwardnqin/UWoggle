import { MULTIPLAYER_TIMER_OPTIONS } from "./multiplayerTimerOptions";

const defaultBlockStyle = { display: "block", marginTop: 8, padding: 8, width: "100%" };

/**
 * Shared timer dropdown for creating multiplayer games.
 */
export default function MultiplayerTimerSelect({
  id = "multiplayer-timer",
  value,
  onChange,
  label = "Timer",
  selectStyle = defaultBlockStyle,
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={selectStyle}
      >
        {MULTIPLAYER_TIMER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
