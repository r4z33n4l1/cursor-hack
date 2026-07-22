import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';

import { Glass } from '@/components/ui/Glass';
import { PressableScale } from '@/components/ui/PressableScale';
import { haptics } from '@/lib/haptics';
import { nextDemoBarcode } from '@/services/demo';
import { radii, spacing, type, useTheme } from '@/theme';

const FRAME_SIZE = 260;

export default function ScanScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  // Laser sweep inside the frame.
  const sweep = useSharedValue(0);
  useEffect(() => {
    sweep.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [sweep]);
  const laserStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sweep.value * (FRAME_SIZE - 4) }],
    opacity: 0.55 + 0.45 * Math.sin(sweep.value * Math.PI),
  }));

  const handleBarcode = useCallback(
    (data: string) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      haptics.lockOn();
      router.replace({ pathname: '/analyzing', params: { barcode: data } });
    },
    [router],
  );

  const simulate = useCallback(() => {
    const barcode = nextDemoBarcode();
    if (barcode) handleBarcode(barcode);
  }, [handleBarcode]);

  return (
    <View style={styles.root}>
      {permission?.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={({ data }) => handleBarcode(data)}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.permissionBg]} />
      )}

      {/* Dimmed vignette around the frame */}
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <PressableScale onPress={() => router.back()} accessibilityLabel="Close scanner">
            <Glass style={styles.circleButton}>
              <SymbolView name="xmark" size={17} tintColor="#FFFFFF" />
            </Glass>
          </PressableScale>
          <Glass style={styles.hintPill}>
            <Text style={[type.footnote, styles.hintText]}>Point at a barcode</Text>
          </Glass>
          <View style={styles.circleButton} />
        </View>

        <View style={styles.frameWrap}>
          <View style={styles.frame}>
            <Corner style={styles.cornerTL} />
            <Corner style={styles.cornerTR} />
            <Corner style={styles.cornerBL} />
            <Corner style={styles.cornerBR} />
            <Animated.View style={[styles.laser, { backgroundColor: colors.accent }, laserStyle]} />
          </View>
        </View>

        <View style={styles.bottomBar}>
          {!permission?.granted ? (
            <PressableScale onPress={() => requestPermission()}>
              <Glass style={styles.actionPill}>
                <SymbolView name="camera" size={17} tintColor="#FFFFFF" />
                <Text style={[type.headline, styles.hintText]}>Allow camera</Text>
              </Glass>
            </PressableScale>
          ) : null}
          <PressableScale onPress={simulate} accessibilityLabel="Simulate a scan">
            <Glass style={styles.actionPill}>
              <SymbolView name="wand.and.stars" size={17} tintColor="#FFFFFF" />
              <Text style={[type.headline, styles.hintText]}>Demo scan</Text>
            </Glass>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

function Corner({ style }: { style: object }) {
  return <View style={[styles.corner, style]} />;
}

const CORNER = 34;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0912' },
  permissionBg: { backgroundColor: '#171226' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 64,
    paddingHorizontal: spacing.gutter,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hintPill: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  hintText: { color: '#FFFFFF' },
  frameWrap: { alignItems: 'center', justifyContent: 'center' },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#FFFFFF',
    borderRadius: 2,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: radii.scanFrame },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: radii.scanFrame },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: radii.scanFrame },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: radii.scanFrame },
  laser: {
    position: 'absolute',
    left: spacing.s,
    right: spacing.s,
    height: 2,
    borderRadius: 1,
    shadowColor: '#B79CFF',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: 56,
    gap: spacing.s,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
});
