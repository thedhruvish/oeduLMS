import axios from "axios";

const BACKEND_SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

export const axiosClient = axios.create({
  baseURL: `${BACKEND_SERVER_URL}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});
