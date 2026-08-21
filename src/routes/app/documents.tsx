import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { downloadIssuerDocument, ingestDocument, listDocuments } from "@/lib/trust/functions";

export const Route = createFileRoute("/app/documents")({ component: DocumentsPage });

function fileToB64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result ?? "");
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

function DocumentsPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listDocuments>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listDocuments()
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onUpload(file: File) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const uploadB64 = await fileToB64(file);
      const res = await ingestDocument({ data: { uploadB64, originalName: file.name } });
      setNotice(
        res.deduped
          ? `Already on file. SHA-256 ${res.hash}`
          : `Ingested. SHA-256 ${res.hash}`,
      );
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onDownload(id: string, name: string) {
    const doc = await downloadIssuerDocument({ data: { id } });
    const bin = Uint8Array.from(atob(doc.content_b64), (c) => c.charCodeAt(0));
    const blob = new Blob([bin], { type: doc.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name || doc.object_name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <p className="font-mono text-xs tracking-[0.18em] text-stone uppercase">Off-chain evidence</p>
      <h1 className="mt-2 font-display text-4xl">Documents</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Inspection uses magic bytes, not the filename. SHA-256 of the exact bytes is the evidence.
        Original files never go on the ledger.
      </p>
      <label className="mt-6 inline-flex h-11 cursor-pointer items-center rounded-sm bg-pine px-5 text-sm font-medium text-pine-fg">
        {busy ? "Inspecting…" : "Upload a document"}
        <input
          type="file"
          className="sr-only"
          accept="application/pdf,image/png,image/jpeg,application/json,.pdf,.png,.jpg,.jpeg,.json"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onUpload(file);
            e.target.value = "";
          }}
        />
      </label>
      {error ? <p className="mt-4 text-invalid">{error}</p> : null}
      {notice ? <p className="mt-4 break-all font-mono text-xs text-valid">{notice}</p> : null}
      <div className="mt-8 overflow-x-auto rounded-xl border border-rule bg-paper-raised">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-rule text-stone">
            <tr>
              <th className="px-4 py-3 font-medium">Hash</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Origin</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-stone" colSpan={5}>
                  No documents ingested in this workspace yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-rule/70 last:border-0">
                  <td className="max-w-[280px] px-4 py-3">
                    <p className="truncate font-mono text-xs" title={r.hash}>
                      {r.hash}
                    </p>
                    <p className="mt-1 text-xs text-stone">
                      {r.original_name ?? r.inspected_kind ?? r.mime} · {r.byte_length} bytes
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.inspected_kind ?? r.mime}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.origin}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.status}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => onDownload(r.id, r.original_name ?? "")}>
                        Download
                      </Button>
                      {r.status !== "ISSUED" ? (
                        <Link
                          to="/app/issue"
                          search={{ documentId: r.id }}
                          className="inline-flex h-9 items-center rounded-sm bg-pine px-3 text-xs font-medium text-pine-fg"
                        >
                          Issue
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
