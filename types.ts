
export interface ImageState {
  originalUrl: string | null;
  processedUrl: string | null;
  file: File | null;
  isProcessing: boolean;
  error: string | null;
}

export interface ProcessingStep {
  label: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
}
