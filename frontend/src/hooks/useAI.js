import { useState, useCallback } from "react";
import { streamAI } from "../services/api";

export function useAI() {
  const [loading,     setLoading]     = useState(false);
  const [streaming,   setStreaming]   = useState(false);
  const [output,      setOutput]      = useState("");
  const [error,       setError]       = useState(null);
  const [lastCredits, setLastCredits] = useState(null); // credits used in last call

  const run = useCallback(async ({ feature, context, onComplete }) => {
    setLoading(true);
    setStreaming(true);
    setOutput("");
    setError(null);
    setLastCredits(null);
    let full = "";

    await streamAI({
      feature,
      context,
      onToken: (text) => {
        full += text;
        setOutput(full);
      },
      onDone: (data) => {
        if (data?.creditsUsed) setLastCredits(data.creditsUsed);
        onComplete?.(full);
        setLoading(false);
        setStreaming(false);
      },
      onError: (msg) => {
        // Surface credit-shortage errors clearly
        const isCredits = msg?.toLowerCase().includes("credit");
        setError(isCredits ? `⚠ ${msg}` : msg);
        setOutput("");
        setLoading(false);
        setStreaming(false);
      },
    });
  }, []);

  const reset = useCallback(() => {
    setOutput(""); setError(null); setLastCredits(null);
  }, []);

  return { run, loading, streaming, output, error, lastCredits, reset };
}
