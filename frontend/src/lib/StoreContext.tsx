import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
} from "react";

type StoreLike = {
    keys: () => Promise<string[]>;
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    save: () => Promise<void>;
};

function createBrowserStore(): StoreLike {
    return {
        keys: async () => {
            const rawValues = window.localStorage.getItem("preferences.json");
            if (!rawValues) return [];

            try {
                return Object.keys(JSON.parse(rawValues) as Record<string, any>);
            } catch {
                return [];
            }
        },
        get: async (key: string) => {
            const rawValues = window.localStorage.getItem("preferences.json");
            if (!rawValues) return null;

            try {
                const values = JSON.parse(rawValues) as Record<string, any>;
                return values[key] ?? null;
            } catch {
                return null;
            }
        },
        set: async (key: string, value: any) => {
            const rawValues = window.localStorage.getItem("preferences.json");
            let values: Record<string, any> = {};

            if (rawValues) {
                try {
                    values = JSON.parse(rawValues) as Record<string, any>;
                } catch {
                    values = {};
                }
            }

            values[key] = value;
            window.localStorage.setItem("preferences.json", JSON.stringify(values));
        },
        save: async () => undefined,
    };
}

export const StoreContext = createContext<{
    storeValues: { [key: string]: any };
    setStoreValue: (key: string, value: any) => void;
    store: StoreLike | null;
    storeInitialized: boolean;
}>({
    storeValues: {},
    setStoreValue: () => { },
    store: null,
    storeInitialized: false,
});

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [storeValues, setStoreValues] = useState<{ [key: string]: any }>({});
    const [store, setStore] = useState<StoreLike | null>(null);
    const [storeInitialized, setStoreInitialized] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const initializeStore = async () => {
            const storeInstance: StoreLike = ("__TAURI_INTERNALS__" in window)
                ? await import("@tauri-apps/plugin-store").then(({ load }) => load("preferences.json"))
                : createBrowserStore();

            if (cancelled) return;

            setStore(storeInstance);

            const keys = await storeInstance.keys();
            const values: { [key: string]: any } = {};
            for (const key of keys) {
                values[key] = await storeInstance.get(key);
            }

            if (cancelled) return;

            setStoreValues(values);
            setStoreInitialized(true);
        };

        initializeStore().catch(() => {
            if (!cancelled) {
                setStore(createBrowserStore());
                setStoreInitialized(true);
            }
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const setStoreValue = useCallback(
        async (key: string, value: any) => {
            if (!store) return;

            setStoreValues((prevValues) => {
                const newValues = { ...prevValues, [key]: value };
                return newValues;
            });

            await store.set(key, value);
            await store.save();
        },
        [store]
    );

    const contextValue = useMemo(
        () => ({ storeValues, setStoreValue, store, storeInitialized }),
        [storeValues, setStoreValue, store]
    );

    if (!store || !storeInitialized) {
        return null;
    }

    return (
        <StoreContext.Provider value={contextValue}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = <T,>(
    key: string,
    initialValue: T
): [T, (value: T | ((oldValue: T) => T)) => void, boolean] => {
    const { storeValues, setStoreValue, storeInitialized } =
        useContext(StoreContext);
    const [value, setValue] = useState<T>(storeValues[key] ?? initialValue);

    useEffect(() => {
        if (storeValues[key] !== undefined && storeValues[key] !== value) {
            setValue(storeValues[key]);
        }
    }, [storeValues, key]);

    const setStoredValue = useCallback(
        (newValue: T | ((oldValue: T) => T)) => {
            const valueToStore =
                typeof newValue === "function"
                    ? (newValue as (oldValue: T) => T)(value)
                    : newValue;
            setValue(valueToStore);
            setStoreValue(key, valueToStore);
        },
        [key, setStoreValue, value]
    );

    return [value, setStoredValue, storeInitialized];
};