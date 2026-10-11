import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WakeItProvider, WakeItBanner, useWakeIt } from "@lalit_kumar/wakeit";
import TodoApp from "./TodoApp";
import "./index.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

// ?wakeit=off  -> plain app (the "before" test). Anything else -> app wrapped in WakeIt.
const wakeitOn = new URLSearchParams(window.location.search).get("wakeit") !== "off";

function WithWakeIt() {
  const { isReady } = useWakeIt();
  return <TodoApp wakeit ready={isReady} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {wakeitOn ? (
      <WakeItProvider healthEndpoint={`${API}/api/health`}>
        <WithWakeIt />
        <WakeItBanner />
      </WakeItProvider>
    ) : (
      <TodoApp wakeit={false} ready />
    )}
  </StrictMode>,
);
