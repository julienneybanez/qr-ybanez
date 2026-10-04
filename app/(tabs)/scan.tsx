import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { registerAttendance } from '@/lib/attendance';
import { useAuth } from '@/lib/auth';

export default function ScanScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionIcon}>
          <Ionicons
            name="camera-outline"
            size={30}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.permissionTitle}>
          Camera permission needed
        </Text>

        <Text style={styles.permissionSubtitle}>
          QR Attendance needs camera access to scan event QR codes.
        </Text>

        <AppButton
          theme="primary"
          title="Grant Permission"
          icon="camera-outline"
          onPress={requestPermission}
        />
      </View>
    );
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;

    setScanned(true);
    setProcessing(true);
    setMessage(null);

    const studentId = user?.id ?? 'unknown';

    try {
      const result = await registerAttendance(data, studentId);
      setMessage(result.message);
      setSuccess(result.success);
    } finally {
      setProcessing(false);
    }
  };

  const handleScanAgain = () => {
    setScanned(false);
    setProcessing(false);
    setMessage(null);
    setSuccess(false);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      <View
        style={[
          styles.topHint,
          { top: insets.top + 16 },
        ]}
      >
        <Text style={styles.topHintTitle}>
          Scan event QR
        </Text>

        <Text style={styles.topHintText}>
          Align the QR code inside the frame
        </Text>
      </View>

      <View style={styles.frame}>
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
      </View>

      <View style={styles.resultCard}>
        {processing ? (
          <>
            <ActivityIndicator
              size="small"
              color={COLORS.primary}
            />

            <Text style={styles.resultTitle}>
              Verifying attendance...
            </Text>
          </>
        ) : scanned && message ? (
          <>
            <View
              style={[
                styles.resultIcon,
                success
                  ? styles.resultIconSuccess
                  : styles.resultIconError,
              ]}
            >
              <Ionicons
                name={
                  success
                    ? 'checkmark-outline'
                    : 'alert-outline'
                }
                size={24}
                color={
                  success
                    ? COLORS.success
                    : COLORS.danger
                }
              />
            </View>

            <Text style={styles.resultTitle}>
              {success ? 'Attendance recorded' : 'Unable to record'}
            </Text>

            <Text style={styles.resultMessage}>
              {message}
            </Text>

            <AppButton
              theme="primary"
              title="Scan Another"
              icon="refresh-outline"
              onPress={handleScanAgain}
            />
          </>
        ) : (
          <>
            <Ionicons
              name="scan-outline"
              size={24}
              color={COLORS.primary}
            />

            <Text style={styles.resultTitle}>
              Ready to scan
            </Text>

            <Text style={styles.resultMessage}>
              Hold your phone steady and keep the QR code inside the guide.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const CORNER_SIZE = 34;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  permissionIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  topHint: {
    position: 'absolute',
    left: 24,
    right: 24,
    backgroundColor: COLORS.overlay,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topHintTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  topHintText: {
    color: '#FFFFFF',
    opacity: 0.88,
    fontSize: 12,
    marginTop: 3,
    textAlign: 'center',
  },
  frame: {
    position: 'absolute',
    width: 230,
    height: 230,
    alignSelf: 'center',
    top: '26%',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#FFFFFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: 12,
  },
  resultCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  resultIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  resultIconSuccess: {
    backgroundColor: COLORS.successSoft,
  },
  resultIconError: {
    backgroundColor: COLORS.dangerSoft,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 8,
  },
  resultMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 14,
  },
});
