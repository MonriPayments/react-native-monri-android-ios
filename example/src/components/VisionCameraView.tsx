import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import ImageResizer from 'react-native-image-resizer';

type VisionCameraViewProps = {
  onCapture: (payload: { uri: string; base64: string }) => void;
  onClose: () => void;
  step?: 'front' | 'back';
  autoCapture?: boolean;
  autoCaptureDelayMs?: number;
  showControls?: boolean;
  feedbackText?: string;
  showFeedback?: boolean;
};

const VisionCameraView: React.FC<VisionCameraViewProps> = ({
  onCapture,
  onClose,
  step,
  autoCapture,
  autoCaptureDelayMs,
  showControls = true,
  feedbackText = '',
  showFeedback = true,
}) => {
  const cameraRef = useRef<Camera | null>(null);
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const hasAutoCapturedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePhoto({
        enableShutterSound: false,
      });

      const originalUri = photo.path.startsWith('file://')
        ? photo.path
        : `file://${photo.path}`;

      // Resize the image before reading base64 to avoid OOM crashes.
      // Target max dimension 1024px, JPEG at 50% quality keeps it well under 1 MB.
      const resized = await ImageResizer.createResizedImage(
        originalUri,
        1024, // max width
        1024, // max height
        'JPEG',
        50, // quality 0-100
        0, // rotation
        undefined, // outputPath (temp)
        false, // keepMeta
        { mode: 'contain', onlyScaleDown: true }
      );

      const resizedPath = resized.uri.startsWith('file://')
        ? resized.uri.replace('file://', '')
        : resized.path;
      const base64 = await RNFS.readFile(resizedPath, 'base64');

      // Clean up the temp resized file
      RNFS.unlink(resizedPath).catch(() => {});

      await onCapture({ uri: resized.uri, base64 });
    } catch (err) {
      console.error('Capture failed inside VisionCameraView:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, onCapture]);

  useEffect(() => {
    if (!autoCapture || !hasPermission || !device) return;
    if (hasAutoCapturedRef.current) return;

    const timeout = setTimeout(() => {
      hasAutoCapturedRef.current = true;
      takePicture();
    }, autoCaptureDelayMs ?? 500);

    return () => clearTimeout(timeout);
  }, [autoCapture, autoCaptureDelayMs, device, hasPermission, takePicture]);

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No camera device found.</Text>
        <TouchableOpacity onPress={onClose} style={styles.buttonSecondary}>
          <Text style={styles.buttonTextSecondary}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={[styles.text, { marginBottom: 12 }]}>
          Camera permission denied.
        </Text>
        <TouchableOpacity
          onPress={() => Linking.openSettings()}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Open Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.buttonSecondary}>
          <Text style={styles.buttonTextSecondary}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.preview}
        device={device}
        isActive={true}
        photo={true}
        audio={false}
        photoQualityBalance="speed"
      />

      {!!step && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>
            {step === 'front' ? 'Capture FRONT' : 'Capture BACK'}
          </Text>
        </View>
      )}

      {showFeedback && (
        <View style={styles.feedbackOverlay}>
          <ActivityIndicator />
          {!!feedbackText && (
            <Text style={styles.feedbackText}>{feedbackText}</Text>
          )}
        </View>
      )}

      {showControls && (
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={takePicture}
            style={styles.button}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.buttonText}>Take Photo</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.buttonSecondary}>
            <Text style={styles.buttonTextSecondary}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  preview: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 24,
    alignSelf: 'center',
    backgroundColor: '#000000aa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  overlayText: { color: '#fff', fontWeight: '700' },
  feedbackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#00000066',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackText: { color: '#fff', marginTop: 8, fontWeight: '600' },
  controls: {
    padding: 16,
    backgroundColor: '#000000aa',
  },
  button: {
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
  },
  buttonSecondary: {
    alignSelf: 'center',
    marginTop: 8,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: { color: '#000', fontWeight: '600' },
  buttonTextSecondary: { color: '#fff', fontWeight: '600' },
  text: { color: '#fff' },
});

export default VisionCameraView;
