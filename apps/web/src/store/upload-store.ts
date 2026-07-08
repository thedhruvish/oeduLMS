import { create } from "zustand";

export interface BackgroundUpload {
  id: string;
  filename: string;
  progress: number;
  status: "uploading" | "completed" | "failed";
  fileUrl?: string;
  key?: string;
}

interface UploadStore {
  uploads: BackgroundUpload[];
  addUpload: (id: string, filename: string) => void;
  updateProgress: (id: string, progress: number) => void;
  completeUpload: (id: string, fileUrl: string, key: string) => void;
  failUpload: (id: string) => void;
  isUploadingAny: () => boolean;
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  uploads: [],
  addUpload: (id, filename) =>
    set((state) => ({
      uploads: [...state.uploads, { id, filename, progress: 0, status: "uploading" }],
    })),
  updateProgress: (id, progress) =>
    set((state) => ({
      uploads: state.uploads.map((u) => (u.id === id ? { ...u, progress } : u)),
    })),
  completeUpload: (id, fileUrl, key) =>
    set((state) => ({
      uploads: state.uploads.map((u) =>
        u.id === id ? { ...u, status: "completed", progress: 100, fileUrl, key } : u
      ),
    })),
  failUpload: (id) =>
    set((state) => ({
      uploads: state.uploads.map((u) => (u.id === id ? { ...u, status: "failed" } : u)),
    })),
  isUploadingAny: () => {
    return get().uploads.some((u) => u.status === "uploading");
  },
}));
