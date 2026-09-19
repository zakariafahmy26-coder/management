import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Network } from '@capacitor/network';
import { AppPlatform } from '../types';
import { compressImage, CompressionResult } from './imageCompression';

export function getAppPlatform(): AppPlatform {
  // Check Electron Windows
  if (
    typeof window !== 'undefined' &&
    (window as any).process?.type ||
    navigator.userAgent.toLowerCase().includes('electron')
  ) {
    return 'windows';
  }

  // Check Capacitor Android
  if (
    typeof window !== 'undefined' &&
    ((window as any).Capacitor?.isNativePlatform?.() ||
      navigator.userAgent.toLowerCase().includes('android')) &&
    !navigator.userAgent.toLowerCase().includes('windows')
  ) {
    return 'android';
  }

  // Check PWA Standalone
  if (
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true)
  ) {
    return 'pwa';
  }

  return 'web';
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Capture photo via Capacitor native camera on Android or file input on Web/Desktop,
 * automatically applying image compression to ensure fast uploads even on weak mobile networks.
 */
export async function capturePhoto(): Promise<string | null> {
  const result = await captureAndCompressPhoto();
  return result ? result.dataUrl : null;
}

/**
 * Captures and compresses a photo, returning both the compressed dataUrl
 * and detailed metrics (original size, compressed size, savings percentage).
 */
export async function captureAndCompressPhoto(options: {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
} = {}): Promise<CompressionResult | null> {
  let rawDataUrl: string | null = null;

  try {
    const platform = getAppPlatform();
    if (platform === 'android' || (window as any).Capacitor?.isPluginAvailable('Camera')) {
      const image = await Camera.getPhoto({
        quality: 75,
        width: options.maxWidth || 1280,
        height: options.maxHeight || 1280,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        promptLabelHeader: 'التقاط صورة',
        promptLabelPhoto: 'من معرض الصور',
        promptLabelPicture: 'التقاط بالكاميرا',
        promptLabelCancel: 'إلغاء',
      });
      rawDataUrl = image.dataUrl || null;
    }
  } catch (err) {
    console.warn('Native camera unavailable or cancelled, using fallback:', err);
  }

  // Web / Desktop Fallback: Return a promise with an invisible file input
  if (!rawDataUrl) {
    rawDataUrl = await new Promise<string | null>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result as string);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };
      input.click();
    });
  }

  if (!rawDataUrl) return null;

  // Run automatic client-side compression
  const compressed = await compressImage(rawDataUrl, {
    maxWidth: options.maxWidth || 1280,
    maxHeight: options.maxHeight || 1280,
    quality: options.quality || 0.72,
    mimeType: 'image/jpeg',
  });

  return compressed;
}

/**
 * Check if the device is currently connected to the network
 */
export async function checkNetworkStatus(): Promise<boolean> {
  try {
    if ((window as any).Capacitor?.isPluginAvailable('Network')) {
      const status = await Network.getStatus();
      return status.connected;
    }
  } catch {
    // ignore
  }
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Listen to network connectivity changes across all platforms
 */
export function listenToNetworkChanges(callback: (online: boolean) => void): () => void {
  const onOnline = () => callback(true);
  const onOffline = () => callback(false);

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  let networkListener: any = null;
  if ((window as any).Capacitor?.isPluginAvailable('Network')) {
    Network.addListener('networkStatusChange', (status) => {
      callback(status.connected);
    }).then((handle) => {
      networkListener = handle;
    });
  }

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    if (networkListener && typeof networkListener.remove === 'function') {
      networkListener.remove();
    }
  };
}
