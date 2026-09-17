import React, { useState } from 'react';
import { Camera, Upload, Calendar, Plus, Check, Image as ImageIcon, X } from 'lucide-react';
import { ProductItem, calculateDaysRemaining, formatSpanishDate } from '../types';
import { CameraCaptureModal } from './CameraCaptureModal';

interface ProductFormProps {
  onAddProduct: (product: Omit<ProductItem, 'id' | 'createdAt' | 'isConsumed'>) => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ onAddProduct }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [expiryDate, setExpiryDate] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Quick date helper
  const setDaysFromToday = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setExpiryDate(d.toISOString().split('T')[0]);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expiryDate) return;

    // Fallback photo if none provided
    const finalImage = imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80';
    const finalName = name.trim() || 'Producto sin nombre';

    onAddProduct({
      name: finalName,
      category,
      imageUrl: finalImage,
      expiryDate,
      notes: notes.trim()
    });

    // Reset form
    setName('');
    setCategory('General');
    setExpiryDate('');
    setImageUrl('');
    setNotes('');
    setFeedbackSuccess(true);
    setTimeout(() => setFeedbackSuccess(false), 3000);
  };

  const daysRemaining = expiryDate ? calculateDaysRemaining(expiryDate) : null;
  const isExpiringWithin10Days = daysRemaining !== null && daysRemaining <= 10 && daysRemaining >= 0;
  const isAlreadyExpired = daysRemaining !== null && daysRemaining < 0;

  return (
    <div
      id="product-entry-card"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm transition-all"
    >
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
              +
            </span>
            Cargar Nuevo Producto
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Sube o toma una foto del producto e ingresa la fecha de vencimiento
          </p>
        </div>

        {feedbackSuccess && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-semibold rounded-full animate-bounce">
            <Check className="w-3.5 h-3.5" /> ¡Producto registrado!
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* PHOTO SECTION */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              1. Foto del Producto <span className="text-emerald-600">*</span>
            </label>

            {imageUrl ? (
              <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-[4/3] flex items-center justify-center">
                <img
                  src={imageUrl}
                  alt="Vista previa del producto"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button
                    type="button"
                    id="open-camera-edit-btn"
                    onClick={() => setIsCameraOpen(true)}
                    className="p-2 rounded-lg bg-white/90 text-slate-800 hover:bg-white text-xs font-medium shadow flex items-center gap-1"
                  >
                    <Camera className="w-4 h-4 text-emerald-600" />
                    Nueva Foto
                  </button>
                  <button
                    type="button"
                    id="remove-photo-btn"
                    onClick={() => setImageUrl('')}
                    className="p-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-xs font-medium shadow"
                    title="Quitar foto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition min-h-[160px] ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Arrastra una imagen aquí o elije una opción:
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    id="btn-take-live-photo"
                    onClick={() => setIsCameraOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Tomar con Cámara
                  </button>
                  <label
                    id="label-upload-file"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-medium cursor-pointer transition shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Subir Archivo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* EXPIRATION DATE & PRODUCT DETAILS */}
          <div className="space-y-4 flex flex-col justify-between">
            {/* Product Name */}
            <div>
              <label htmlFor="product-name-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nombre del Producto
              </label>
              <input
                id="product-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Leche Descremada, Yogurt Natural, Pollo..."
                className="w-full px-3 py-2 rounded-xl text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Expiration Date Input */}
            <div>
              <label htmlFor="product-expiry-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                2. Fecha de Vencimiento <span className="text-emerald-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="product-expiry-input"
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Fast Date Helper Chips */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400 dark:text-slate-500">Atajos:</span>
                <button
                  type="button"
                  id="shortcut-3-days-btn"
                  onClick={() => setDaysFromToday(3)}
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition"
                >
                  +3 días (Alerta)
                </button>
                <button
                  type="button"
                  id="shortcut-7-days-btn"
                  onClick={() => setDaysFromToday(7)}
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition"
                >
                  +7 días (Alerta)
                </button>
                <button
                  type="button"
                  id="shortcut-10-days-btn"
                  onClick={() => setDaysFromToday(10)}
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 font-semibold transition"
                >
                  +10 días (Límite alerta)
                </button>
                <button
                  type="button"
                  id="shortcut-20-days-btn"
                  onClick={() => setDaysFromToday(20)}
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition"
                >
                  +20 días
                </button>
              </div>
            </div>

            {/* Live Expiration Notice Preview */}
            {expiryDate && (
              <div
                id="live-expiration-preview"
                className={`p-3 rounded-xl text-xs border ${
                  isAlreadyExpired
                    ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    : isExpiringWithin10Days
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  {isAlreadyExpired ? (
                    <span>❌ ¡Atención: Este producto ya está vencido!</span>
                  ) : isExpiringWithin10Days ? (
                    <span>⚠️ ¡Alerta activa! Vence en {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'} (≤ 10 días)</span>
                  ) : (
                    <span>✅ En buen estado (Vence en {daysRemaining} días)</span>
                  )}
                </div>
                <p className="text-[11px] opacity-90">
                  {isExpiringWithin10Days
                    ? `Te mostrará el mensaje de aviso detallado porque faltan ${daysRemaining} días para el ${formatSpanishDate(expiryDate)}.`
                    : isAlreadyExpired
                    ? `Venció el ${formatSpanishDate(expiryDate)}.`
                    : `No activará la alerta hasta que falten 10 días para el ${formatSpanishDate(expiryDate)}.`}
                </p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              id="submit-product-btn"
              disabled={!expiryDate}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              <Plus className="w-4 h-4" />
              Guardar y Monitorear Vencimiento
            </button>
          </div>
        </div>
      </form>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(img) => setImageUrl(img)}
      />
    </div>
  );
};
