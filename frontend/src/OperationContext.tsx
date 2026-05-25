import React, { createContext, useContext, useState, useCallback } from "react";
import { client } from "./App";

import type { AppError } from "./lib/error";
import OperationView from "./OperationView";

export type Operation = {
  id: string;
  titleKey: string;
  successMessageKey?: string;
  successTitleKey?: string;
  steps: OperationStep[];
};

export type OperationStep = {
  id: string;
  titleKey: string;
  hideProgress?: boolean;
};

export type OperationState = {
  current: Operation;
  completed: string[];
  started: { step_id: string; progress?: number }[];
  failed: {
    step_id: string;
    extra_details: AppError;
  }[];
};

type OperationInfoUpdate = {
  update_type: "started" | "finished";
  step_id: string;
};

type OperationProgressUpdate = {
  update_type: "progress";
  step_id: string;
  progress: number;
};

type OperationFailedUpdate = {
  update_type: "failed";
  step_id: string;
  extra_details: AppError;
};

export type OperationUpdate =
  | OperationInfoUpdate
  | OperationProgressUpdate
  | OperationFailedUpdate;

export const installSideStoreOperation: Operation = {
  id: "install_sidestore",
  titleKey: "operations.install_sidestore_title",
  successTitleKey: "operations.install_sidestore_success_title",
  successMessageKey: "operations.install_sidestore_success_message",
  steps: [
    {
      id: "download",
      titleKey: "operations.install_sidestore_step_download",
    },
    {
      id: "sign",
      titleKey: "next.operations.install_sidestore_step_sign",
    },
    {
      id: "install",
      titleKey: "next.operations.install_sidestore_step_install",
    },
    {
      id: "pairing",
      titleKey: "operations.install_sidestore_step_pairing",
      hideProgress: true,
    },
  ],
};

export const installLiveContainerOperation: Operation = {
  id: "install_sidestore",
  titleKey: "operations.install_livecontainer_title",
  successTitleKey: "operations.install_livecontainer_success_title",
  successMessageKey: "operations.install_livecontainer_success_message",
  steps: [
    {
      id: "download",
      titleKey: "operations.install_livecontainer_step_download",
    },
    {
      id: "sign",
      titleKey: "next.operations.install_livecontainer_step_sign",
    },
    {
      id: "install",
      titleKey: "next.operations.install_livecontainer_step_install",
    },
    {
      id: "pairing",
      titleKey: "operations.install_livecontainer_step_pairing",
      hideProgress: true,
    },
  ],
};

export const sideloadOperation = {
  id: "sideload",
  titleKey: "operations.sideload_title",
  steps: [
    {
      id: "sign",
      titleKey: "next.operations.sideload_step_sign",
    },
    {
      id: "install",
      titleKey: "next.operations.sideload_step_install",
    },
  ],
};

export const OperationContext = createContext<{
  state: OperationState | null;
  startOperation: (
    operation: Operation,
    livecontainer?: boolean,
    nightly?: boolean,
  ) => Promise<void>;
  clearOperation: () => void;
}>({
  state: null,
  startOperation: async () => {},
  clearOperation: () => {},
});

export const OperationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [operationState, setOperationState] = useState<OperationState | null>(
    null,
  );

  const startOperation = useCallback(
    async (
      operation: Operation,
      livecontainer?: boolean,
      nightly?: boolean,
    ) => {
      setOperationState({
        current: operation,
        started: [],
        failed: [],
        completed: [],
      });
      return new Promise<void>(async (resolve, reject) => {
        const unlistenFn = await client.listen<OperationUpdate>(
          "operation_" + operation.id,
          (event) => {
            setOperationState((old) => {
              if (old == null) return null;
              if (event.update_type === "started") {
                return {
                  ...old,
                  started: [
                    ...old.started,
                    { step_id: event.step_id, progress: 0 },
                  ],
                };
              } else if (event.update_type === "finished") {
                return {
                  ...old,
                  completed: [...old.completed, event.step_id],
                };
              } else if (event.update_type === "failed") {
                return {
                  ...old,
                  failed: [
                    ...old.failed,
                    {
                      step_id: event.step_id,
                      extra_details: event.extra_details,
                    },
                  ],
                };
              } else if (event.update_type === "progress") {
                return {
                  ...old,
                  started: old.started.map((s) =>
                    s.step_id === event.step_id
                      ? { ...s, progress: event.progress }
                      : s,
                  ),
                };
              }
              return old;
            });
          },
        );
        try {
          if (operation.id === "install_sidestore") {
            await client.installSidestoreOperation(
              nightly ?? false,
              livecontainer ?? false,
            );
          } else if (operation.id === "sideload") {
            await client.installAppOperation();
          }
          unlistenFn();
          resolve();
        } catch (e) {
          unlistenFn();
          reject(e);
        }
      });
    },
    [],
  );

  return (
    <OperationContext.Provider
      value={{
        state: operationState,
        startOperation,
        clearOperation: () => setOperationState(null),
      }}
    >
      <OperationView />
      {children}
    </OperationContext.Provider>
  );
};

export const useOperations = () => {
  return useContext(OperationContext);
};
