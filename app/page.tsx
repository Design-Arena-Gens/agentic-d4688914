"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type VoiceOption = SpeechSynthesisVoice & { id: string };

type NarrationStatus = "idle" | "speaking" | "paused";

const defaultSample = `Welcome to the pro voice reader. Paste any script or article here, pick a premium voice, and click Speak to hear it performed.`;

const SLIDER_LABELS: Record<string, string[]> = {
  rate: ["narration", "conversational", "promo"],
  pitch: ["warm", "neutral", "bright"],
  volume: ["softer", "balanced", "boosted"]
};

export default function Page() {
  const [text, setText] = useState<string>(defaultSample);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [rate, setRate] = useState<number>(1.05);
  const [pitch, setPitch] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [status, setStatus] = useState<NarrationStatus>("idle");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceSupport = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!voiceSupport) return;

    const loadVoices = () => {
      const loaded = window.speechSynthesis
        .getVoices()
        .filter((voice) => !voice.localService || voice.name.toLowerCase().includes("enhanced"))
        .map((voice, index) => Object.assign(voice, { id: `${voice.voiceURI}-${index}` }));

      setVoices(loaded);

      if (!selectedVoiceId && loaded.length > 0) {
        const preferred = loaded.find((voice) =>
          /premium|wave|studio|en-us|en-gb/i.test(`${voice.name} ${voice.lang}`)
        );
        setSelectedVoiceId(preferred?.id ?? loaded[0].id);
      }
    };

    loadVoices();

    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, [voiceSupport, selectedVoiceId]);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedVoice = useMemo(() => voices.find((v) => v.id === selectedVoiceId) ?? null, [
    voices,
    selectedVoiceId
  ]);

  const speak = () => {
    if (!voiceSupport || !text.trim()) {
      return;
    }

    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.rate = clamp(rate, 0.5, 2);
    utterance.pitch = clamp(pitch, 0.1, 2);
    utterance.volume = clamp(volume, 0, 1);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => setStatus("speaking");
    utterance.onpause = () => setStatus("paused");
    utterance.onresume = () => setStatus("speaking");
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("idle");

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = () => {
    if (!voiceSupport) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setStatus("idle");
  };

  const togglePause = () => {
    if (!voiceSupport) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    } else if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  };

  const handleSlider = (setter: (value: number) => void) =>
    (event: React.ChangeEvent<HTMLInputElement>) => setter(parseFloat(event.target.value));

  if (!voiceSupport) {
    return (
      <main className="page">
        <article className="panel">
          <h1>Professional Voice Reader</h1>
          <p className="muted">
            Your browser does not provide speech synthesis. Try Chrome, Edge, or Safari for the best
            studio voices.
          </p>
        </article>
      </main>
    );
  }

  return (
    <main className="page">
      <article className="panel">
        <header className="intro">
          <div>
            <h1>Professional Voice Reader</h1>
            <p className="muted">
              Craft narration-ready audio using premium web voices. Paste your script, fine-tune the
              performance, and audition instantly.
            </p>
          </div>
        </header>

        <section className="controls">
          <label className="field">
            <span>Script</span>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={8}
              placeholder="Paste the copy you want to hear..."
            />
          </label>

          <label className="field">
            <span>Voice</span>
            <select
              value={selectedVoiceId}
              onChange={(event) => setSelectedVoiceId(event.target.value)}
              disabled={voices.length === 0}
            >
              {voices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} · {voice.lang}
                </option>
              ))}
            </select>
            {voices.length === 0 && (
              <p className="muted small">Loading enhanced voices&hellip;</p>
            )}
          </label>

          <div className="control-grid">
            <TweakSlider
              label="Delivery Speed"
              value={rate}
              min={0.7}
              max={1.4}
              step={0.01}
              onChange={handleSlider(setRate)}
              labels={SLIDER_LABELS.rate}
            />
            <TweakSlider
              label="Tone"
              value={pitch}
              min={0.7}
              max={1.3}
              step={0.01}
              onChange={handleSlider(setPitch)}
              labels={SLIDER_LABELS.pitch}
            />
            <TweakSlider
              label="Presence"
              value={volume}
              min={0.6}
              max={1}
              step={0.01}
              onChange={handleSlider(setVolume)}
              labels={SLIDER_LABELS.volume}
            />
          </div>
        </section>

        <footer className="actions">
          <button className="primary" onClick={speak} disabled={!text.trim()}>
            {status === "speaking" ? "Replay" : "Speak"}
          </button>
          <button className="ghost" onClick={togglePause} disabled={status === "idle"}>
            {status === "paused" ? "Resume" : "Pause"}
          </button>
          <button className="ghost" onClick={stopSpeech} disabled={status === "idle"}>
            Stop
          </button>
          <span className="status">Status: {capitalize(status)}</span>
        </footer>
      </article>
    </main>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function capitalize(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

type TweakSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  labels: string[];
};

function TweakSlider({ label, value, min, max, step, onChange, labels }: TweakSliderProps) {
  return (
    <label className="slider">
      <div className="slider-header">
        <span>{label}</span>
        <span className="readout">{value.toFixed(2)}</span>
      </div>
      <input type="range" value={value} min={min} max={max} step={step} onChange={onChange} />
      <div className="slider-labels">
        {labels.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </label>
  );
}
