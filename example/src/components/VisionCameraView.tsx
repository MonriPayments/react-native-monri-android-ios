import React, { useEffect, useRef, useState } from 'react';
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

type VisionCameraViewProps = {
  onCapture: (payload: { uri: string; base64: string }) => void;
  onClose: () => void;
  step?: 'front' | 'back';
};

const VisionCameraView: React.FC<VisionCameraViewProps> = ({
  onCapture,
  onClose,
  step,
}) => {
  const cameraRef = useRef<Camera | null>(null);
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePhoto({});
      const filePath = photo.path.startsWith('file://')
        ? photo.path
        : `file://${photo.path}`;
      const base64 = await RNFS.readFile(photo.path, 'base64');
      onCapture({ uri: filePath, base64 });
    } finally {
      setIsCapturing(false);
    }
  };

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
      />

      {!!step && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>
            {step === 'front' ? 'Capture FRONT' : 'Capture BACK'}
          </Text>
        </View>
      )}

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
