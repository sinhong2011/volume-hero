import { render } from "solid-js/web";
import { Toaster } from "solid-toast";

import "./style.css";
import App from "./App";

const root = document.getElementById("root");
if (root) {
  render(
    () => (
      <>
        <App />
        <Toaster
          position="top-center"
          gutter={8}
          toastOptions={{
            duration: 2000,
            style: {
              "font-size": "14px",
              background: "var(--color-macos-card)",
              color: "var(--color-macos-text)",
              "border-radius": "var(--radius-macos-md)",
              border: "1px solid var(--color-macos-divider)",
            },
          }}
        />
      </>
    ),
    root
  );
}
