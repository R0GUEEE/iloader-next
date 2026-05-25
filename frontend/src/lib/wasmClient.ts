import initWasm, {
  get_devices,
  login,
  logged_in_as,
  install_app_operation,
  install_sidestore_operation,
} from "iloader-wasm";
import type { AccountInfo, DeviceInfo, iloaderAPI } from "./client";

export const wasmClient: iloaderAPI = {
  async init() {
    await initWasm();
  },

  async getDevices(): Promise<DeviceInfo[]> {
    return get_devices();
  },

  async openUrl(url: string): Promise<void> {
    window.open(url, "_blank");
  },

  async login(
    email: string,
    password: string,
    get2FA: () => Promise<string>,
  ): Promise<void> {
    return login(email, password, get2FA);
  },
  logged_in_as: async function (): Promise<AccountInfo | null> {
    return new Promise(async (resolve) => {
      const result = await logged_in_as();
      if (result === undefined) {
        resolve(null);
        return;
      }
      resolve(result);
    });
  },
  listen: function <T>(
    event: string,
    callback: (data: T) => void,
  ): Promise<() => void> {
    return new Promise((resolve) => {
      const handler = (e: CustomEvent) => {
        if (e.type === event) {
          callback(e.detail as T);
        }
      };
      window.addEventListener(event, handler as EventListener);
      resolve(() =>
        window.removeEventListener(event, handler as EventListener),
      );
    });
  },
  installAppOperation: function (): Promise<void> {
    return install_app_operation();
  },
  installSidestoreOperation: function (
    nightly: boolean,
    livecontainer: boolean,
  ): Promise<void> {
    return install_sidestore_operation(nightly, livecontainer);
  },
};
