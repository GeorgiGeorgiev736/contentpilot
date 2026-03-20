import { createContext, useContext, useState, useCallback } from "react";

const Ctx = createContext(null);

const defaultDraft = () => ({
  step: 0,
  clipStart: "", clipEnd: "", makeShort: false,
  frames: [], thumbIdx: 0,
  title: "", description: "", hashtags: "",
  selPlatforms: [], postNow: false,
  scheduleTime: (() => {
    const d = new Date(Date.now() + 3600000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  })(),
});

export function UploadProvider({ children }) {
  // upload: { file, preview } — video stays in browser, never uploaded to our server
  const [upload, setUpload] = useState(null);
  // All wizard state lives here so it survives page navigation
  const [draft, setDraft] = useState(defaultDraft());

  const patchDraft = useCallback((patch) => {
    setDraft(prev => ({ ...prev, ...patch }));
  }, []);

  const selectFile = useCallback((file) => {
    if (!file || !file.type.startsWith("video/")) return false;
    if (upload?.preview) URL.revokeObjectURL(upload.preview);
    setUpload({ file, preview: URL.createObjectURL(file) });
    setDraft(defaultDraft());
    return true;
  }, [upload]);

  const clearUpload = useCallback(() => {
    if (upload?.preview) URL.revokeObjectURL(upload.preview);
    setUpload(null);
    setDraft(defaultDraft());
  }, [upload]);

  return (
    <Ctx.Provider value={{ upload, selectFile, clearUpload, draft, patchDraft }}>
      {children}
    </Ctx.Provider>
  );
}

export const useUpload = () => useContext(Ctx);
