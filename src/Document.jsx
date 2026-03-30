import { memo, useEffect, useRef } from "react";
import "./Document.css";
import { markdownToHtmlFull as markdownToHtml } from "./markdownUtils";

// ── DocumentSection ─────────────────────────────────────────
const DocumentSection = memo(function DocumentSection({ sectionKey, content, updatedAt }) {
  const ref = useRef(null);
  const prevUpdated = useRef(updatedAt);

  // Fade-in animation when section content changes
  useEffect(() => {
    if (prevUpdated.current !== updatedAt && ref.current) {
      ref.current.classList.remove("section-updated");
      void ref.current.offsetWidth; // reflow
      ref.current.classList.add("section-updated");
    }
    prevUpdated.current = updatedAt;
  }, [updatedAt]);

  return (
    <div
      ref={ref}
      className="doc-section"
      data-key={sectionKey}
      dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
    />
  );
});

// ── applyPatch ───────────────────────────────────────────────
/**
 * Apply a patch to the document state.
 * patch: { sectionKey, content, action: "upsert"|"delete"|"reorder", newOrder }
 */
export function applyPatch(doc, patch) {
  const { sectionKey, content, action = "upsert", newOrder } = patch;
  if (action === "delete") {
    const sections = { ...doc.sections };
    delete sections[sectionKey];
    return { sections, order: doc.order.filter((k) => k !== sectionKey) };
  }
  if (action === "reorder" && Array.isArray(newOrder)) {
    return { ...doc, order: newOrder };
  }
  // upsert
  const now = new Date().toISOString();
  const isNew = !doc.sections[sectionKey];
  return {
    sections: {
      ...doc.sections,
      [sectionKey]: { content, updatedAt: now },
    },
    order: isNew ? [...doc.order, sectionKey] : doc.order,
  };
}

// ── Document (main component) ────────────────────────────────
/**
 * Document — renders all sections in order.
 * Props:
 *   docState  { sections: {[key]: {content, updatedAt}}, order: string[] }
 *   isRtl     boolean
 */
export function Document({ docState, isRtl }) {
  const { sections = {}, order = [] } = docState ?? {};

  if (order.length === 0) {
    return (
      <div className="doc-body" dir={isRtl ? "rtl" : "ltr"}>
        <div className="doc-placeholder">
          <span className="doc-icon">📄</span>
          <p>המסמך יוצג כאן</p>
        </div>
      </div>
    );
  }

  return (
    <div className="doc-body" dir={isRtl ? "rtl" : "ltr"}>
      {order.map((key) =>
        sections[key] ? (
          <DocumentSection
            key={key}
            sectionKey={key}
            content={sections[key].content}
            updatedAt={sections[key].updatedAt}
          />
        ) : null
      )}
    </div>
  );
}
