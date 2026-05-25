import initWasm, {
  read_lockdown,
  get_devices,
  login,
  logged_in_as,
  install_app,
} from "iloader-wasm";
import type { Account, DeviceInfo, iloaderAPI } from "./client";

export const wasmClient: iloaderAPI = {
  async init() {
    await initWasm();
  },

  async getDevices(): Promise<DeviceInfo[]> {
    return get_devices();
  },

  async readLockdown(): Promise<string> {
    return read_lockdown();
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
  logged_in_as: async function (): Promise<Account | null> {
    return new Promise(async (resolve) => {
      const result = await logged_in_as();
      if (result === undefined) {
        resolve(null);
        return;
      }
      resolve(result);
    });
  },
  installApp: function (): Promise<void> {
    return install_app();
  },
};
