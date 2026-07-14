import axios from "axios";
import { axiosClient } from "@/lib/axios-client";

import { useAuthStore } from "@/store/auth/auth-store";

export interface PresignResponse {
  uploadUrl: string;
  fileUrl: string;
  key: string;
}

export interface UploadProgressCallback {
  (progress: number): void;
}

/**
 * Request S3 presigned URL and upload file from the browser directly.
 */
export async function uploadFileToS3(
  file: File,
  directory: string = "general",
  onProgress?: UploadProgressCallback
): Promise<PresignResponse> {
  const role = useAuthStore.getState().role;
  const prefix = role === "TEACHER" ? "/admin" : "/dash";

  // 1. Fetch presigned upload URL from the server
  const { data } = await axiosClient.post<PresignResponse>(`${prefix}/media/presign-upload`, {
    filename: file.name,
    contentType: file.type,
    directory,
  });

  const { uploadUrl, fileUrl, key } = data;

  // 2. Perform raw PUT request to S3 bucket without app headers
  await axios.put(uploadUrl, file, {
    headers: {
      "Content-Type": file.type,
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });

  return { uploadUrl, fileUrl, key };
}

/**
 * Delete S3 media object from bucket
 */
export async function deleteFileFromS3(key: string): Promise<void> {
  const role = useAuthStore.getState().role;
  const prefix = role === "TEACHER" ? "/admin" : "/dash";

  await axiosClient.delete(`${prefix}/media`, {
    data: { key },
  });
}

import { useUploadStore } from "@/store/upload-store";
import { toast } from "sonner";

/**
 * Initiates an asynchronous background S3 upload, updating the Zustand store's status
 */
export function startBackgroundUpload(
  file: File,
  directory: string = "general",
  onComplete?: (url: string, key: string) => void
): string {
  const id = crypto.randomUUID();
  const store = useUploadStore.getState();

  store.addUpload(id, file.name);

  uploadFileToS3(file, directory, (progress) => {
    useUploadStore.getState().updateProgress(id, progress);
  })
    .then((res) => {
      useUploadStore.getState().completeUpload(id, res.fileUrl, res.key);
      toast.success(`Upload completed: ${file.name}`);
      if (onComplete) onComplete(res.fileUrl, res.key);
    })
    .catch((err) => {
      console.error(`Failed to upload ${file.name}:`, err);
      useUploadStore.getState().failUpload(id);
      toast.error(`Upload failed: ${file.name}`);
    });

  return id;
}
