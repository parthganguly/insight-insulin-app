import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReferenceApiError } from "../../api/experimentalReference";
import { ReferenceCatalogStaleNotice } from "./ReferenceCatalogStaleNotice";

describe("stale catalog notice", () => {
  it("asks for explicit fresh browse and re-review on typed stale 409", async () => {
    const onBrowseAgain = vi.fn();
    render(<ReferenceCatalogStaleNotice error={new ReferenceApiError(409, "stale_catalog_version", "r2_sha256_new")} onBrowseAgain={onBrowseAgain} />);
    expect(screen.getByRole("alert")).toHaveTextContent("review each selected reference again");
    expect(onBrowseAgain).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Browse references again" }));
    expect(onBrowseAgain).toHaveBeenCalledOnce();
  });
  it("does not confuse other failures or conflicts with stale catalog", () => {
    const { container } = render(<ReferenceCatalogStaleNotice error={new ReferenceApiError(409, "request_id_conflict")} onBrowseAgain={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
