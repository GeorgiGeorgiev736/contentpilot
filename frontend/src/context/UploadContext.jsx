import { createContext, useContext, useState, useRef, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const Ctx = createContext(null);

const defaultDraft = () => ({
  step: 0,
  clipStart: "", clipEnd: "", makeShort: false,
  frames: [], thumbIdx: 0,
  title: "", description: "", hashtags: "",
  selPlatforms: [], postNow: false,
  scheduleTime: (() => { const d = new Date(Date.now() + 3600000); d.setSeconds(0,0); return d.toISOString().slice(0,16); })(),
});

export function UploadProvider({ children }) {
  // Upload progress state
  // { file, preview, progress 0-100, status: 'uploading'|'done'|'error', videoUrl, error }
  const [upload, setUpload] = useState(null);
  const xhrRef = useRef(null);

  // Wizard draft state — persists across page navigation
  const [draft, setDraft] = useState(defaultDraft());

  const patchDraft = useCallback((patch) => {
    setDraft(prev => ({ ...prev, ...patch }));
  }, []);

  const startUpload = useCallback((file) => {
    if (!file || !file.type.startsWith("video/")) return;
    if (upload?.preview) URL.revokeObjectURL(upload.preview);
    const preview = URL.createObjectURL(file);
    setUpload({ file, preview, progress: 0, status: "uploading", videoUrl: null, error: null });
    // Reset draft for new video
    setDraft(defaultDraft());

    const token = localStorage.getItem("token");
    const fd = new FormData();
    fd.append("video", file);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setUpload(prev => prev ? { ...prev, progress: pct } : prev);
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.video_url) {
          setUpload(prev => prev ? { ...prev, status: "done", videoUrl: data.video_url, progress: 100 } : prev);
        } else {
          setUpload(prev => prev ? { ...prev, status: "error", error: data.error || "Upload failed" } : prev);
        }
      } catch {
        setUpload(prev => prev ? { ...prev, status: "error", error: "Upload failed" } : prev);
      }
    };

    xhr.onerror = () => {
      setUpload(prev => prev ? { ...prev, status: "error", error: "Network error — check connection" } : prev);
    };

    xhr.open("POST", `${API}/api/schedule/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(fd);
  }, [upload]);

  const clearUpload = useCallback(() => {
    xhrRef.current?.abort();
    setUpload(null);
    setDraft(defaultDraft());
  }, []);

  return (
    <Ctx.Provider value={{ upload, startUpload, clearUpload, draft, patchDraft }}>
      {children}
    </Ctx.Provider>
  );
}

export const useUpload = () => useContext(Ctx);
