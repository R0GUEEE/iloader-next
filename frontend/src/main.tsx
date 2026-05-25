import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Toaster } from "@/components/ui/sonner";
import PlatformGate from "./PlatformGate.tsx";
import { StoreProvider } from "./lib/StoreContext.tsx";
import { LogProvider } from "./LogContext.tsx";
import { OperationProvider } from "./OperationContext.tsx";
import { PlatformProvider } from "./PlatformContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PlatformGate>
      <PlatformProvider>
        <StoreProvider>
          <LogProvider>
            <OperationProvider>
              <App />
              <Toaster expand />
            </OperationProvider>
          </LogProvider>
        </StoreProvider>
      </PlatformProvider>
    </PlatformGate>
  </StrictMode>,
);
