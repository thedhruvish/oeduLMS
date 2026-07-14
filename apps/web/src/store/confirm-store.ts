import { create } from "zustand";

export interface ConfirmOptions {
  title: React.ReactNode;
  desc: React.JSX.Element | string;
  confirmText?: React.ReactNode;
  cancelBtnText?: string;
  destructive?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
  closeOnConfirm?: boolean;
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  onConfirm: () => void;
  onCancel: () => void;
  setIsLoading: (isLoading: boolean) => void;
  close: () => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  options: null,
  resolve: null,
  confirm: (options) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        options: {
          closeOnConfirm: true,
          ...options,
        },
        resolve,
      });
    });
  },
  onConfirm: () => {
    const { resolve, options } = get();
    if (resolve) resolve(true);
    if (options?.closeOnConfirm !== false) {
      set({ isOpen: false, options: null, resolve: null });
    }
  },
  onCancel: () => {
    const { resolve } = get();
    if (resolve) resolve(false);
    set({ isOpen: false, options: null, resolve: null });
  },
  setIsLoading: (isLoading) => {
    const { options } = get();
    if (options) {
      set({
        options: {
          ...options,
          isLoading,
        },
      });
    }
  },
  close: () => {
    set({ isOpen: false, options: null, resolve: null });
  },
}));

export const useConfirm = () => {
  return useConfirmStore((state) => state.confirm);
};
