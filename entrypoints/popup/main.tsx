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
              background: "#282a36",
              color: "#f8f8f2",
              "border-radius": "8px",
              border: "1px solid #44475a",
            },
          }}
        />
      </>
    ),
    root
  );
}
