"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  ScanLine,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { useT } from "@/components/providers/locale-provider";
import { useToast } from "@/components/providers/toast-provider";
import { formatBytes, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const ACCEPTED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const ACCEPT_ATTR = ".pdf,.png,.jpg,.jpeg,.webp";

interface QueueItem {
  id: string;
  file: File;
  status: "queued" | "uploading" | "processing" | "done" | "error";
  progress: number;
  message?: string;
  documentId?: string;
  resultsFound?: number;
  warnings?: string[];
}

interface UploadResponse {
  document?: { id: string; status: string; errorMessage?: string | null };
  processing?: { resultsFound: number; warnings: string[]; engine: string } | null;
  error?: string;
}

export function DocumentUploader({ profileId, maxBytes }: { profileId: string; maxBytes: number }) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [items, setItems] = useState<QueueItem[]>([]);

  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const uploadFile = useCallback(
    (item: QueueItem) => {
      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("profileId", profileId);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/documents/upload");
      xhr.responseType = "text";

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const progress = Math.round((event.loaded / event.total) * 100);
        updateItem(item.id, { progress, status: progress >= 100 ? "processing" : "uploading" });
      };
      xhr.upload.onload = () => {
        // Upload finished; the server is now validating + extracting.
        updateItem(item.id, { status: "processing", progress: 100 });
      };
      xhr.onload = () => {
        let data: UploadResponse = {};
        try {
          data = JSON.parse(xhr.responseText) as UploadResponse;
        } catch {
          data = { error: "Unexpected response from the server." };
        }
        if (xhr.status >= 200 && xhr.status < 300 && data.document) {
          updateItem(item.id, {
            status: "done",
            progress: 100,
            documentId: data.document.id,
            resultsFound: data.processing?.resultsFound ?? 0,
            warnings: data.processing?.warnings ?? [],
          });
          if (data.document.status === "failed") {
            updateItem(item.id, {
              status: "error",
              message: data.document.errorMessage ?? t("docs.upload.failed"),
            });
          } else {
            toast({
              title: t("docs.upload.complete"),
              description: `${data.processing?.resultsFound ?? 0} value(s) extracted for review.`,
              variant: "success",
            });
          }
          router.refresh();
        } else {
          const message = data.error ?? `Upload failed (HTTP ${xhr.status}).`;
          updateItem(item.id, { status: "error", message });
          toast({ title: t("docs.upload.failed"), description: message, variant: "error" });
        }
      };
      xhr.onerror = () => {
        updateItem(item.id, { status: "error", message: "Network error while uploading." });
      };
      xhr.send(formData);
    },
    [profileId, router, t, toast, updateItem],
  );

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const nextItems: QueueItem[] = [];

      for (const file of files) {
        const id = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        if (!ACCEPTED.includes(file.type)) {
          nextItems.push({ id, file, status: "error", progress: 0, message: t("docs.upload.invalidType") });
          continue;
        }
        if (file.size > maxBytes) {
          nextItems.push({
            id,
            file,
            status: "error",
            progress: 0,
            message: t("docs.upload.tooLarge", { max: formatBytes(maxBytes) }),
          });
          continue;
        }
        if (file.size === 0) {
          nextItems.push({ id, file, status: "error", progress: 0, message: "The file is empty." });
          continue;
        }
        nextItems.push({ id, file, status: "queued", progress: 0 });
      }

      setItems((prev) => [...nextItems, ...prev].slice(0, 12));
      nextItems.filter((item) => item.status === "queued").forEach(uploadFile);
    },
    [maxBytes, t, uploadFile],
  );

  const active = items.some((item) => item.status === "uploading" || item.status === "processing");

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        aria-label={t("docs.upload.dropzone")}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer.files.length) handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[var(--radius-card)] border-2 border-dashed px-6 py-14 text-center transition-all",
          dragging
            ? "border-accent/60 bg-accent-dim"
            : "border-line hover:border-line-strong hover:bg-panel/40",
        )}
      >
        {active && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute inset-x-0 h-16 animate-scan bg-gradient-to-b from-transparent via-accent/10 to-transparent" />
          </div>
        )}
        <div className="flex size-12 items-center justify-center rounded-full border border-accent/25 bg-accent-dim">
          <UploadCloud className="size-5 text-accent" aria-hidden />
        </div>
        <p className="mt-4 text-sm font-medium text-ink">{t("docs.upload.dropzone")}</p>
        <p className="mt-1 text-xs text-muted">{t("docs.upload.dropzoneHint")}</p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-faint">
          PDF · PNG · JPEG · WEBP · max {formatBytes(maxBytes)}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files?.length) handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <AnimatePresence initial={false}>
        {items.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
            aria-live="polite"
          >
            {items.map((item) => (
              <li key={item.id} className="panel p-3.5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-panel-raised">
                    {item.status === "done" ? (
                      <CheckCircle2 className="size-4 text-success" aria-hidden />
                    ) : item.status === "error" ? (
                      <AlertCircle className="size-4 text-danger" aria-hidden />
                    ) : item.status === "processing" ? (
                      <ScanLine className="size-4 animate-pulse text-accent" aria-hidden />
                    ) : item.status === "uploading" ? (
                      <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
                    ) : (
                      <FileText className="size-4 text-muted" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-medium text-ink">{item.file.name}</p>
                      <span className="shrink-0 font-mono text-[10px] text-faint">
                        {formatBytes(item.file.size)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {item.status === "queued" && "Queued…"}
                      {item.status === "uploading" && `${t("common.processing")} ${item.progress}%`}
                      {item.status === "processing" && t("docs.upload.extracting")}
                      {item.status === "done" &&
                        `${item.resultsFound ?? 0} value(s) extracted · ${t("docs.status.needs_review")}`}
                      {item.status === "error" && (item.message ?? t("docs.upload.failed"))}
                    </p>
                    {(item.status === "uploading" || item.status === "processing") && (
                      <Progress
                        className="mt-2"
                        value={item.progress}
                        indeterminate={item.status === "processing"}
                        label={item.status === "processing" ? t("docs.upload.extracting") : "Upload progress"}
                      />
                    )}
                    {item.status === "done" && item.documentId && (
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <Link
                          href={`/dashboard/documents/${item.documentId}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                        >
                          Review extraction <ArrowRight className="size-3" aria-hidden />
                        </Link>
                        {item.warnings && item.warnings.length > 0 && (
                          <span className="text-[10px] text-warning">
                            {formatNumber(item.warnings.length)} note(s) to review
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {item.status === "error" && (
                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((entry) => entry.id !== item.id))}
                      className="rounded p-1 text-faint hover:text-ink"
                      aria-label="Dismiss"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-faint">
          Files are validated by content type, stored privately, and processed on the server.
        </p>
        {items.length > 0 && !active && (
          <Button variant="ghost" size="sm" onClick={() => setItems([])}>
            Clear list
          </Button>
        )}
      </div>
    </div>
  );
}
