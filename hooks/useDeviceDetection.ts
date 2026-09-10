// hooks/useDeviceDetection.ts

import { useState, useEffect } from 'react';

export const useDeviceDetection = () => {
  const [isAndroid, setIsAndroid] = useState(false);
  const [isWindows, setIsWindows] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    // Detectar Android
    const android = /android/i.test(userAgent);
    // Detectar Windows
    const windows = /win/i.test(userAgent);
    // Detectar móvil/tablet
    const mobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

    setIsAndroid(android);
    setIsWindows(windows);
    setIsMobile(mobile);
  }, []);

  return { isAndroid, isWindows, isMobile };
};