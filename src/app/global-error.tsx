"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#07111f",
          color: "#f4f8fc",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>PARIKSHAN could not load</h1>
          <p style={{ color: "#9aadc4", fontSize: 14, lineHeight: 1.6 }}>
            A fatal application error occurred. No records were modified.
            {error.digest ? ` Reference: ${error.digest}` : ""}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              background: "#42e8f5",
              color: "#04121a",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload the application
          </button>
        </div>
      </body>
    </html>
  );
}
