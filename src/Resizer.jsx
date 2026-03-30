import { useCallback } from "react";

/**
 * Resizer — draggable divider between two panels.
 * onDrag(clientX) passes the absolute mouse X so the parent
 * can compute the exact width from its bounding rect.
 */
export function Resizer({ onDrag }) {
  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault();

      const onMove = (ev) => onDrag(ev.clientX);
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [onDrag]
  );

  return <div className="resizer" onMouseDown={handleMouseDown} />;
}
