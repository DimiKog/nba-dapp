"use client";

import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main
          style={{
            alignItems: "center",
            background: "#020617",
            color: "#f8fafc",
            display: "flex",
            fontFamily: "Arial, Helvetica, sans-serif",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "24px",
          }}
        >
          <section
            role="alert"
            style={{
              border: "1px solid #334155",
              borderRadius: "16px",
              maxWidth: "560px",
              padding: "32px",
              width: "100%",
            }}
          >
            <p style={{ color: "#fca5a5", fontSize: "12px", fontWeight: 700, letterSpacing: "0.18em" }}>
              APPLICATION ERROR
            </p>
            <h1 style={{ fontSize: "28px", margin: "12px 0" }}>My NBA needs to reload.</h1>
            <p style={{ color: "#cbd5e1", lineHeight: 1.5 }}>
              Your account and data have not been changed. Reload the application to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#f8fafc",
                border: 0,
                borderRadius: "8px",
                color: "#0f172a",
                cursor: "pointer",
                fontWeight: 700,
                marginTop: "24px",
                padding: "10px 16px",
              }}
              type="button"
            >
              Reload application
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
