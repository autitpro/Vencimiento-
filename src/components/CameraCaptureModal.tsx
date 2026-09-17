import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, X, Check, AlertCircle, Upload } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);

  useEffect(() => {
    if (isOpen && !capturedPhoto) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setIsLoadingCamera(true);
    setCameraError(null);
    stopCamera();

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        'No se pudo acceder a la cámara. Por favor permite los permisos o sube una foto desde tu galería.'
      );
    } finally {
      setIsLoadingCamera(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
      handleClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedPhoto(null);
    setCameraError(null);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setCapturedPhoto(result);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div
      id="camera-capture-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
    >
      <div
        id="camera-capture-modal-container"
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              {capturedPhoto ? 'Revisar Foto' : 'Tomar Foto del Producto'}
            </h3>
          </div>
          <button
            id="close-camera-modal-btn"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative bg-black aspect-[4/3] flex items-center justify-center overflow-hidden">
          {capturedPhoto ? (
            <img
              src={capturedPhoto}
              alt="Foto capturada"
              className="w-full h-full object-contain"
            />
          ) : cameraError ? (
            <div className="p-6 text-center text-white flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 text-amber-400" />
              <p className="text-sm max-w-xs">{cameraError}</p>
              <label
                id="camera-fallback-upload-btn"
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl cursor-pointer transition shadow"
              >
                <Upload className="w-4 h-4" />
                Subir foto desde archivo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {isLoadingCamera && (
                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-sm">
                  Iniciando cámara...
                </div>
              )}
            </>
          )}

          {/* Hidden Canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          {capturedPhoto ? (
            <>
              <button
                id="retake-photo-btn"
                onClick={handleRetake}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Repetir foto
              </button>
              <button
                id="confirm-photo-btn"
                onClick={handleConfirm}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition shadow-sm"
              >
                <Check className="w-4 h-4" />
                Usar esta foto
              </button>
            </>
          ) : (
            <>
              <label
                id="file-upload-alternative-btn"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <Upload className="w-4 h-4" />
                Subir archivo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                id="trigger-shutter-btn"
                onClick={takePhoto}
                disabled={!!cameraError}
                className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                title="Tomar foto"
              >
                <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center">
                  <div className="w-7 h-7 rounded-full bg-white" />
                </div>
              </button>

              <button
                id="switch-facing-mode-btn"
                onClick={toggleFacingMode}
                className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title="Cambiar cámara frontal/trasera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
