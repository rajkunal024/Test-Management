import { create } from "zustand";
import { Test } from "../types";

interface TestState {
  testData: Test | null;
  setTestData: (testData: Test) => void;
  clearTestData: () => void;
}

export const useTestStore = create<TestState>((set) => ({
  testData: null,
  setTestData: (testData) => set({ testData }),
  clearTestData: () => set({ testData: null }),
}));
