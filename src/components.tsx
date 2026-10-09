import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { X, TreePine, Layers3, Sprout, Wheat, Mountain } from "lucide-react";
import { COLORS, NAMES, RESOURCES } from "./game/types";
import type { Hand, Resource } from "./game/types";
const ICONS = {
  wood: TreePine,
  brick: Layers3,
  wool: Sprout,
  grain: Wheat,
  ore: Mountain,
};
export function ResourceIcon({
  resource,
  size = 17,
}: {
  resource: Resource;
  size?: number;
}) {
  const Icon = ICONS[resource];
  return <Icon size={size} color={COLORS[resource]} />;
}
export function ResourceList({ hand }: { hand: Hand }) {
  return (
    <span className="resource-list">
      {RESOURCES.filter((r) => hand[r] > 0).map((r) => (
        <span key={r} title={NAMES[r]}>
          <ResourceIcon resource={r} size={16} />
          {hand[r]}
        </span>
      ))}
    </span>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const d = ref.current;
    const prior = document.activeElement as HTMLElement | null;
    d?.showModal();
    return () => {
      d?.close();
      prior?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-title">
        <h2 id={id}>{title}</h2>
        <button className="icon-btn" aria-label="Cerrar" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function HandPicker({
  value,
  onChange,
  max,
  label,
}: {
  value: Hand;
  onChange: (h: Hand) => void;
  max?: Hand;
  label: string;
}) {
  return (
    <fieldset className="hand-picker">
      <legend>{label}</legend>
      {RESOURCES.map((r) => (
        <label key={r}>
          <span>
            <ResourceIcon resource={r} />
            {NAMES[r]}
          </span>
          <input
            aria-label={`${label}: ${NAMES[r]}`}
            type="number"
            min="0"
            max={max?.[r] ?? 99}
            value={value[r]}
            onChange={(e) =>
              onChange({
                ...value,
                [r]: Math.max(
                  0,
                  Math.min(
                    max?.[r] ?? 99,
                    Math.floor(Number(e.target.value) || 0),
                  ),
                ),
              })
            }
          />
        </label>
      ))}
    </fieldset>
  );
}
export function ResourceSelect({
  value,
  onChange,
  label,
}: {
  value: Resource;
  onChange: (r: Resource) => void;
  label: string;
}) {
  return (
    <label className="field-label">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Resource)}
      >
        {RESOURCES.map((r) => (
          <option value={r} key={r}>
            {NAMES[r]}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Dice({ value }: { value: number }) {
  return (
    <span className="die" aria-label={`Dado ${value}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <i
          key={i}
          style={{
            visibility: (
              {
                1: [4],
                2: [0, 8],
                3: [0, 4, 8],
                4: [0, 2, 6, 8],
                5: [0, 2, 4, 6, 8],
                6: [0, 2, 3, 5, 6, 8],
              } as Record<number, number[]>
            )[value]?.includes(i)
              ? "visible"
              : "hidden",
          }}
        />
      ))}
    </span>
  );
}
