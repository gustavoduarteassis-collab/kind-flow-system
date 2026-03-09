import { useState, useEffect, useCallback } from "react";
import { Store, createDefaultChecklist } from "@/data/checklistData";
import { createDefaultCronograma } from "@/data/cronogramaData";

const STORAGE_KEY = "checklist-stores";

function loadStores(): Store[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const stores: Store[] = JSON.parse(raw);
    // Migrate old stores missing cronograma
    return stores.map((s) => ({
      ...s,
      cronograma: s.cronograma || createDefaultCronograma(),
    }));
  } catch {
    return [];
  }
}

function saveStores(stores: Store[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stores));
}

export function useStores() {
  const [stores, setStores] = useState<Store[]>(loadStores);

  useEffect(() => {
    saveStores(stores);
  }, [stores]);

  const addStore = useCallback((data: Omit<Store, "id" | "checklist" | "cronograma">) => {
    const newStore: Store = {
      ...data,
      id: crypto.randomUUID(),
      checklist: createDefaultChecklist(),
      cronograma: createDefaultCronograma(),
    };
    setStores((prev) => {
      const updated = [...prev, newStore];
      saveStores(updated);
      return updated;
    });
    return newStore.id;
  }, []);

  const updateStore = useCallback((id: string, data: Partial<Store>) => {
    setStores((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
  }, []);

  const deleteStore = useCallback((id: string) => {
    setStores((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const getStore = useCallback((id: string) => stores.find((s) => s.id === id), [stores]);

  return { stores, addStore, updateStore, deleteStore, getStore };
}
