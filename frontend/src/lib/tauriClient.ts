import { invoke } from "@tauri-apps/api/core";
import type { Account, DeviceInfo, iloaderAPI } from "./client";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { AppError } from "./error";
import { toast } from "sonner";
import { emit, listen } from "@tauri-apps/api/event";

export const tauriClient: iloaderAPI = {
  async init() {},

  async getDevices(): Promise<DeviceInfo[]> {
    const devices =
      await invoke<Array<{ Ok: DeviceInfo } | { Err: AppError }>>(
        "get_devices",
      );

    const validDevices: DeviceInfo[] = [];
    devices.forEach((result, index) => {
      if ("Ok" in result) {
        validDevices.push(result.Ok);
      } else if ("Err" in result) {
        toast.error(`Error loading device ${index}: ` + result.Err);
      }
    });

    return validDevices;
  },

  async readLockdown(): Promise<string> {
    return invoke("read_lockdown");
  },

  async openUrl(url: string): Promise<void> {
    return openUrl(url);
  },

  async login(
    email: string,
    password: string,
    get2FA: () => Promise<string | null>,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const unlisten = await listen("2fa-required", async () => {
        try {
          const code = await get2FA();
          await emit("2fa-recieved", code);
        } catch (e) {
          reject(e);
        }
      });
      await invoke("login", { email, password });

      await unlisten();

      resolve();
    });
  },
  logged_in_as: async function (): Promise<Account | null> {
    let account = await invoke<Account | null>("logged_in_as");
    console.log("Logged in as:", account);
    return account;
  },
  installApp: function (): Promise<void> {
    throw new Error("Function not implemented.");
  },
  listen: function <T>(
    event: string,
    callback: (data: T) => void,
  ): Promise<() => void> {
    return new Promise(async (resolve) => {
      const unlisten = await listen<T>(event, (e) => {
        callback(e.payload);
      });
      resolve(unlisten);
    });
  },
};
