import { useId } from "react";
import { ReferenceApiError } from "../../api/experimentalReference";
import "./referencePicker.css";

export function ReferenceCatalogStaleNotice({ error, onBrowseAgain }: { error: unknown; onBrowseAgain: () => void }) {
  const titleId = useId();
  if (!(error instanceof ReferenceApiError) || error.status !== 409 || error.code !== "stale_catalog_version") return null;
  return <section className="reference-catalog-stale" role="alert" aria-labelledby={titleId}>
    <h2 id={titleId}>Published references have changed</h2>
    <p>Browse the current catalog and review each selected reference again before retrying. Your previous selection has not been updated automatically.</p>
    <button type="button" onClick={onBrowseAgain}>Browse references again</button>
  </section>;
}
