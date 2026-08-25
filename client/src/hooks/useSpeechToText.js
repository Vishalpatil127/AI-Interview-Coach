import { useCallback, useEffect, useRef, useState } from 'react';

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function useSpeechToText({ lang = 'en-US' } = {}) {
  const SpeechRecognition = getSpeechRecognition();
  const hasSupport = !!SpeechRecognition;

  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechError, setSpeechError] = useState('');

  const resetTranscript = useCallback(() => {
    setFinalTranscript('');
    setInterimTranscript('');
    setSpeechError('');
  }, []);

  const handleResult = useCallback((event) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0]?.transcript || '';
      if (result.isFinal) final += (final ? ' ' : '') + text.trim();
      else interim += (interim ? ' ' : '') + text.trim();
    }

    if (final) {
      setFinalTranscript((prev) => (prev ? prev + ' ' + final : final));
    }
    setInterimTranscript(interim);
  }, []);

  const handleEnd = useCallback(() => {
    if (recognitionRef.current) {
      if (isListening && SpeechRecognition) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            // ignore restart failures
          }
        }, 200);
      } else {
        setIsListening(false);
      }
    }
  }, [isListening, SpeechRecognition]);

  const handleError = useCallback((event) => {
    const err = event?.error || event;
    setSpeechError(typeof err === 'string' ? err : err?.message || 'Speech recognition error');
    setIsListening(false);
    // eslint-disable-next-line no-console
    console.warn('SpeechRecognition error', err);
  }, []);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.onresult = null;
        rec.onend = null;
        rec.onerror = null;
        rec.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    if (!SpeechRecognition) return;

    // ensure any existing instance is stopped before starting
    stopListening();

    const instance = new SpeechRecognition();
    instance.lang = lang;
    instance.interimResults = true;
    instance.continuous = true;
    instance.maxAlternatives = 1;
    instance.onresult = handleResult;
    instance.onend = handleEnd;
    instance.onerror = handleError;

    recognitionRef.current = instance;

    try {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const p = await navigator.permissions.query({ name: 'microphone' });
          if (p?.state === 'denied') {
            setSpeechError('Microphone access denied. Please allow microphone permissions and try again.');
            setIsListening(false);
            return;
          }
        } catch (e) {
          // ignore permission API failures
        }
      }

      instance.start();
      setIsListening(true);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('SpeechRecognition start failed', err);
      setIsListening(false);
    }
  }, [SpeechRecognition, handleResult, handleEnd, handleError, lang, stopListening]);

  useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      if (rec) {
        try {
          rec.onresult = null;
          rec.onend = null;
          rec.onerror = null;
          rec.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  const transcript = [finalTranscript, interimTranscript].filter(Boolean).join(interimTranscript ? ' ' : '');

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    hasSupport,
    speechError,
  };
}
