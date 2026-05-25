import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Toaster } from "@/components/ui/sonner";
import PlatformGate from "./PlatformGate.tsx";
import { StoreProvider } from "./lib/StoreContext.tsx";
import { LogProvider } from "./LogContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PlatformGate>
      <StoreProvider>
        <LogProvider>
          <App />
          <Toaster expand />
        </LogProvider>
      </StoreProvider>
    </PlatformGate>
  </StrictMode>,
);
