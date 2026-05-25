import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { client } from "./App";

export interface ExtendedLogRecord {
  level: number;
  message: string;
  target?: string;
  timestamp: string;
}

export enum LogLevel {
  Trace = 1,
  Debug = 2,
  Info = 3,
  Warn = 4,
  Error = 5,
}

export const LogContext = createContext<ExtendedLogRecord[]>([]);

export const LogProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [logs, setLogs] = useState<ExtendedLogRecord[]>([]);
  const listenerAdded = useRef<boolean>(false);
  let unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!listenerAdded.current) {
      const setupLogger = async () => {
        listenerAdded.current = true;
        unlistenRef.current = await client.listen<ExtendedLogRecord>(
          "log-record",
          (event) => {
            switch (event.level) {
              case LogLevel.Trace:
                console.debug(event.message);
                break;
              case LogLevel.Debug:
                console.debug(event.message);
                break;
              case LogLevel.Info:
                console.info(event.message);
                break;
              case LogLevel.Warn:
                console.warn(event.message);
                break;
              case LogLevel.Error:
                console.error(event.message);
                break;
              default:
                console.log(event.message);
            }
            setLogs((prevLogs) => [...prevLogs, event]);
          },
        );
      };

      setupLogger();
    }

    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, []);

  return <LogContext.Provider value={logs}>{children}</LogContext.Provider>;
};

export const useLogs = () => {
  return useContext(LogContext);
};
