import React, { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { UploadCloud, File, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface FileUploadProps {
  onUploadComplete: (url: string, name: string) => void;
  className?: string;
}

export function FileUpload({ onUploadComplete, className }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: globalThis.File) => {
    if (file.type !== 'application/pdf') {
      setError('Seuls les fichiers PDF sont acceptés.');
      return;
    }

    setUploading(true);
    setError(null);

    const storageRef = ref(storage, `sessions/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(progress);
      },
      (error) => {
        console.error('Upload failed:', error);
        setError('Erreur lors du téléchargement.');
        setUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        onUploadComplete(downloadURL, file.name);
        setUploading(false);
        setProgress(0);
      }
    );
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100",
          uploading && "opacity-50 pointer-events-none"
        )}
      >
        <input
          type="file"
          accept="application/pdf"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
          disabled={uploading}
        />
        
        {uploading ? (
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <div className="text-sm font-medium text-zinc-600">
              Téléchargement... {Math.round(progress)}%
            </div>
            <div className="w-48 h-2 bg-zinc-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2 text-zinc-500">
            <UploadCloud className="w-10 h-10 text-zinc-400" />
            <p className="text-sm font-medium">
              Glissez votre PDF ici ou cliquez
            </p>
            <p className="text-xs text-zinc-400">PDF uniquement (max 10MB)</p>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-500 flex items-center">
          <X className="w-4 h-4 mr-1" /> {error}
        </p>
      )}
    </div>
  );
}
