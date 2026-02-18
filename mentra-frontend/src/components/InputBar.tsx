import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export default function InputBar({
  onSend,
}: {
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);

  const baseTextRef = useRef("");
  const finalTranscriptRef = useRef("");
  const recognitionRef = useRef<any>(null);
  const userStoppedRef = useRef(false); // ✅ track if user manually stopped

  const SpeechRec = useMemo(() => {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {}
    };
  }, []);

  const ensureRecognition = () => {
    if (!SpeechRec) return null;

    if (!recognitionRef.current) {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let interim = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscriptRef.current += chunk;
          else interim += chunk;
        }

        const composed =
          (baseTextRef.current ? baseTextRef.current.trimEnd() + " " : "") +
          finalTranscriptRef.current +
          interim;

        setText(composed.trim());
      };

      recognition.onend = () => {
        // ✅ Chrome sometimes ends unexpectedly — restart unless user stopped
        if (!userStoppedRef.current) {
          try {
            recognition.start();
            return;
          } catch {}
        }
        setListening(false);
      };

      recognition.onerror = () => {
        userStoppedRef.current = true;
        setListening(false);
      };

      recognitionRef.current = recognition;
    }

    return recognitionRef.current;
  };

  const handleMicClick = () => {
    if (!SpeechRec) {
      alert("Speech recognition not supported in this browser (try Chrome).");
      return;
    }

    const recognition = ensureRecognition();
    if (!recognition) return;

    if (!listening) {
      userStoppedRef.current = false;
      baseTextRef.current = text;
      finalTranscriptRef.current = "";

      try {
        recognition.start();
        setListening(true);
      } catch {
        setListening(true);
      }
    } else {
      userStoppedRef.current = true;
      try {
        recognition.stop();
      } finally {
        setListening(false);
      }
    }
  };

  const stopMicIfNeeded = () => {
    if (!listening) return;
    userStoppedRef.current = true;
    try {
      recognitionRef.current?.stop?.();
    } catch {}
    setListening(false);
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // ✅ stop mic before sending so it doesn’t keep editing the input
    stopMicIfNeeded();

    onSend(trimmed);
    setText("");
    baseTextRef.current = "";
    finalTranscriptRef.current = "";
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3 bg-white/70 backdrop-blur border border-white/50 rounded-full px-4 py-2 shadow-sm">
        {/* Attach */}
        <button
          className="w-9 h-9 rounded-full bg-white hover:bg-mentra-mintActive transition flex items-center justify-center"
          aria-label="Attach"
          type="button"
        >
          ⟡
        </button>

        {/* Input */}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Type a message..."
          className="flex-1 outline-none text-sm bg-transparent placeholder:text-mentra-muted"
        />

        {/* Mic */}
        <button
          onClick={handleMicClick}
          type="button"
          className={`w-9 h-9 rounded-full flex items-center justify-center transition
            ${
              listening
                ? "bg-red-500 text-white animate-pulse"
                : "bg-white hover:bg-mentra-mintActive text-mentra-text"
            }
          `}
          aria-label={listening ? "Stop recording" : "Start recording"}
          title={listening ? "Stop recording" : "Start recording"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3z" />
            <path d="M19 11a7 7 0 01-14 0H3a9 9 0 0018 0h-2z" />
          </svg>
        </button>

        {/* Send */}
        <button
          onClick={submit}
          type="button"
          className="bg-mentra-mintDark text-white w-9 h-9 rounded-full flex items-center justify-center hover:opacity-90 transition"
          aria-label="Send"
        >
          →
        </button>
      </div>

      <p className="mt-2 text-xs text-mentra-muted text-center">
        Mentra answers using your uploaded course materials only
      </p>
    </div>
  );
}
