import * as React from 'react';

interface ISpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onerror: (event: any) => void;
  onresult: (event: any) => void;
  onaudiostart: (event: any) => void;
  onaudioend: (event: any) => void;
  onspeechstart: (event: any) => void;
  onspeechend: (event: any) => void;
  start: () => void;
  stop: () => void;

  new(): ISpeechRecognition;
}

/**
 * We use a hook to default to 'false/null' and dynamically create the engine and update the UI.
 * @param onResultCallback - the callback to invoke when a result is received
 * @param useShortcutCtrlKey - the key to use as a shortcut to start/stop the speech recognition (e.g. 'm' for "Ctrl + M")
 */
export const useSpeechRecognition = (onResultCallback: (transcript: string) => void, useShortcutCtrlKey?: string) => {
  // enablers
  const [isSpeechEnabled, setIsSpeechEnabled] = React.useState<boolean>(false);
  const [recognition, setRecognition] = React.useState<ISpeechRecognition | null>(null);

  // session
  const [isRecordingAudio, setIsRecordingAudio] = React.useState<boolean>(false);
  const [isRecordingSpeech, setIsRecordingSpeech] = React.useState<boolean>(false);
  const [isSpeechError, setIsSpeechError] = React.useState<boolean>(false);
  const [isMicMute, setIsMicMute] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const Speech = ((window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition ||
        (window as any).mozSpeechRecognition ||
        (window as any).msSpeechRecognition
      ) as ISpeechRecognition;

      if (typeof Speech !== 'undefined') {
        setIsSpeechEnabled(true);
        const instance = new Speech();
        instance.lang = 'en-US';
        instance.interimResults = false;
        instance.maxAlternatives = 1;

        instance.onerror = event => {
          console.error('Error occurred during speech recognition:', event.error);
          setIsSpeechError(true);
        };

        instance.onresult = (event) => {
          if (!event?.results?.length) return;
          let transcript = event.results[event.results.length - 1][0].transcript;
          // shall we have these smarts?
          transcript = (transcript || '')
            .replaceAll(' question mark', '?')
            .replaceAll(' comma', ',')
            .replaceAll(' exclamation mark', '!');
          if (transcript)
            onResultCallback(transcript);
        };

        instance.onaudiostart = () => setIsRecordingAudio(true);

        instance.onaudioend = () => setIsRecordingAudio(false);

        instance.onspeechstart = () => setIsRecordingSpeech(true);

        instance.onspeechend = () => setIsRecordingSpeech(false);

        setRecognition(instance);
      }
    }
  }, [onResultCallback]);


  const toggleRecording = React.useCallback(() => {
    if (!recognition)
      return console.error('Speech recognition is not supported or not initialized.');

    setIsSpeechError(false);
    if (!isRecordingAudio && !isRecordingSpeech)
      recognition.start();
    else
      recognition.stop();
  }, [recognition, isRecordingAudio]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (useShortcutCtrlKey && event.ctrlKey && event.key === useShortcutCtrlKey)
        toggleRecording();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleRecording, useShortcutCtrlKey]);

  return { isSpeechEnabled, isSpeechError, isRecordingAudio, isRecordingSpeech, toggleRecording };
};