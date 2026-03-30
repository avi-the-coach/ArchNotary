import { useState } from "react";
import "./DocumentToolbar.css";

const FORMATS = [
  { value: "md", label: "Markdown" },
  { value: "html", label: "HTML" },
  { value: "pdf", label: "PDF", disabled: true },
];

/**
 * DocumentToolbar — RTL/LTR toggle, format selector, download button.
 * Props:
 *   isRtl      {boolean}
 *   onRtlToggle {fn}
 *   onDownload  {fn(format)}
 */
export function DocumentToolbar({ isRtl, onRtlToggle, onDownload }) {
  const [format, setFormat] = useState("md");

  const handleDownload = () => onDownload?.(format);

  return (
    <div className="doc-toolbar">
      {/* RTL / LTR toggle */}
      <button
        className={`btn-dir ${isRtl ? "active" : ""}`}
        onClick={onRtlToggle}
        title={isRtl ? "Switch to LTR" : "Switch to RTL"}
      >
        {isRtl ? "RTL ←" : "→ LTR"}
      </button>

      <div className="toolbar-sep" />

      {/* Format selector */}
      <select
        className="format-select"
        value={format}
        onChange={(e) => setFormat(e.target.value)}
      >
        {FORMATS.map((f) => (
          <option key={f.value} value={f.value} disabled={f.disabled}>
            {f.label}{f.disabled ? " (soon)" : ""}
          </option>
        ))}
      </select>

      {/* Download */}
      <button className="btn-download" onClick={handleDownload} title="Download document">
        ⬇ Download
      </button>
    </div>
  );
}
