export type DeviceInfo = {
  udid: string;
  name: string;
  connection_type: "USB" | "Network" | "Unknown" | "WebUSB";
  version: string;
};

export type AccountInfo = {
  email: string;
  first_name: string;
  last_name: string;
};

export interface iloaderAPI {
  init(): Promise<void>;
  openUrl(url: string): Promise<void>;
  getDevices(): Promise<DeviceInfo[]>;
  login(
    email: string,
    password: string,
    get2FA: () => Promise<string>,
  ): Promise<void>;
  logged_in_as(): Promise<AccountInfo | null>;

  listen<T>(event: string, callback: (data: T) => void): Promise<() => void>;

  installSidestoreOperation(
    nightly: boolean,
    livecontainer: boolean,
  ): Promise<void>;
  installAppOperation(): Promise<void>;
}

let clientInstance: iloaderAPI | null = null;

export async function getClient(): Promise<iloaderAPI> {
  if (clientInstance) return clientInstance;

  if ("__TAURI_INTERNALS__" in window) {
    const { tauriClient } = await import("./tauriClient");
    clientInstance = tauriClient;
  } else {
    const { wasmClient } = await import("./wasmClient");
    clientInstance = wasmClient;
  }

  return clientInstance;
}
