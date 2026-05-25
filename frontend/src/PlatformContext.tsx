import React, { createContext, useContext, useEffect, useState } from "react";

export const PlatformContext = createContext<{
  platform: "windows" | "mac" | "linux" | "web";
}>({ platform: "windows" });

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [platform, setPlatform] = useState<"mac" | "windows" | "linux" | "web">(
    "windows",
  );

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) {
      setPlatform("web");
      return;
    }
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent || "";
    if (ua.includes("Mac")) {
      setPlatform("mac");
    } else if (ua.includes("Win")) {
      setPlatform("windows");
    } else if (ua.includes("Linux")) {
      setPlatform("linux");
    }
  }, []);

  return (
    <PlatformContext.Provider
      value={{
        platform,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
};

export const usePlatform = () => {
  return useContext(PlatformContext);
};
