declare module 'react-native-document-scanner-plugin' {
  interface ScanResult {
    scannedImages: string[];
  }

  export function scanDocument(options?: {
    letUserAdjustCrop?: boolean;
    maxNumDocuments?: number;
  }): Promise<ScanResult>;
}
