import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Animated, AppState, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { createInternetProbeTarget, InternetAccess, type InternetStatus } from '@/lib/internetAccess';
import { F, P, R } from '@/constants/theme';

export const INTERNET_REQUIRED_MESSAGE = 'Internet connection required! Please connect to Wi-Fi or mobile data to play Slice & Bloom.';

function getProbeTarget() {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim()
    || Constants.expoConfig?.extra?.apiBaseUrl;
  const webOrigin = Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : undefined;
  try {
    return createInternetProbeTarget(apiBaseUrl, webOrigin);
  } catch {
    // Invalid runtime config fails closed instead of crashing the app startup.
    return createInternetProbeTarget(undefined, webOrigin);
  }
}

let netInfoConfigured = false;
function configureNetworkMonitor() {
  if (netInfoConfigured) return;
  const target = getProbeTarget();
  NetInfo.configure({
    reachabilityUrl: target.url,
    reachabilityMethod: 'GET',
    reachabilityTest: async response => response.status === target.expectedStatus,
    reachabilityShortTimeout: 5000,
    reachabilityLongTimeout: 15000,
    reachabilityRequestTimeout: 6000,
    reachabilityShouldRun: () => AppState.currentState === 'active' || AppState.currentState === null,
    shouldFetchWiFiSSID: false,
    useNativeReachability: false,
  });
  netInfoConfigured = true;
}

/** Probe the same API required for private progress sync; no player data is sent. */
async function probeInternet() {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  const target = getProbeTarget();
  const url = new URL(target.url);
  url.searchParams.set('online_check', String(Date.now()));
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 6000);
  try {
    const response = await fetch(url.toString(), {
      method: 'GET', cache: 'no-store', redirect: 'error', signal: abort.signal,
    });
    return response.status === target.expectedStatus;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

type InternetContextValue = {
  status: InternetStatus;
  online: boolean;
  check: (blocking?: boolean, force?: boolean) => Promise<boolean>;
  isOnline: () => boolean;
};
const InternetContext = createContext<InternetContextValue | null>(null);

export function InternetProvider({ children }: { children: React.ReactNode }) {
  const monitor = useMemo(() => new InternetAccess(probeInternet), []);
  const { status } = useSyncExternalStore(monitor.subscribe, monitor.getSnapshot, monitor.getSnapshot);
  useEffect(() => {
    let active = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    // Poll the configured game API as well as observing OS network transitions.
    configureNetworkMonitor();
    let networkKey = '';
    const unsubscribe = NetInfo.addEventListener(state => {
      if (!active) return;
      const nextKey = `${state.type}:${state.isConnected}:${state.isInternetReachable}`;
      if (nextKey !== networkKey) {
        networkKey = nextKey;
        monitor.suspend(); // A proof from the previous network cannot permit play.
      }
      if (state.isConnected === false) monitor.disconnect();
      else {
        if (state.isInternetReachable === false) monitor.disconnect();
        void monitor.check();
      }
    });
    if (active) void monitor.check(true);
    const subscription = AppState.addEventListener('change', state => {
      active = state === 'active';
      if (active) void monitor.check(true, true);
      else monitor.suspend();
    });
    return () => {
      unsubscribe();
      subscription.remove();
      monitor.suspend(); // Invalidate responses from a previous mount.
    };
  }, [monitor]);
  const value = useMemo(() => ({
    status, online: status === 'online', check: monitor.check, isOnline: monitor.isOnline,
  }), [status, monitor]);
  return <InternetContext.Provider value={value}>{children}</InternetContext.Provider>;
}

export function useInternetAccess() {
  const context = useContext(InternetContext);
  if (!context) throw new Error('InternetProvider is required.');
  return context;
}

export function InternetRequiredModal({ cloudReady, cloudStatus, cloudError, retryCloud }: {
  cloudReady: boolean;
  cloudStatus: string;
  cloudError?: string;
  retryCloud: () => Promise<void>;
}) {
  const { status, check } = useInternetAccess();
  const pathname = usePathname();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [retryFeedback, setRetryFeedback] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const retryShake = useRef(new Animated.Value(0)).current;
  const checking = status === 'checking';
  const waitingForCloud = status === 'online' && !cloudReady;
  const visible = (status !== 'online' || !cloudReady) && pathname !== '/privacy';
  const retryShakeX = retryShake.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-6, 0, 6],
  });
  useEffect(() => {
    if (status === 'online') setRetryFeedback(false);
  }, [status]);
  const retry = async () => {
    if (retrying) return;
    setRetrying(true);
    setRetryFeedback(false);
    try {
      if (await check(true, true)) {
        await retryCloud();
        return;
      }
    } catch {
      // The fail-closed status and retry feedback below handle probe failures.
    } finally {
      setRetrying(false);
    }
    setRetryFeedback(true);
    retryShake.setValue(0);
    Animated.sequence([
      Animated.timing(retryShake, { toValue: 1, duration: 65, useNativeDriver: true }),
      Animated.timing(retryShake, { toValue: -1, duration: 65, useNativeDriver: true }),
      Animated.timing(retryShake, { toValue: 0, duration: 65, useNativeDriver: true }),
    ]).start();
  };
  // Privacy can always be read. Gameplay remains paused behind that route.
  return (
    <Modal visible={visible} transparent animationType="fade"
      statusBarTranslucent onRequestClose={() => {}}>
      <SafeAreaView style={styles.scrim}>
        <Animated.View style={[styles.card, { height: Math.max(0, Math.min(440, height - insets.top - insets.bottom - 32)) }, { transform: [{ translateX: retryShakeX }] }]}
          testID="internet-required-modal" accessibilityViewIsModal>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <Ionicons name="wifi" size={44} color={P.drop} />
            <Text accessibilityRole="header" style={styles.title}>
              {checking ? 'Checking internet…' : waitingForCloud ? 'Syncing private save…' : 'Internet required'}
            </Text>
            <Text accessibilityLiveRegion="polite" style={styles.body}>
              {checking ? 'Checking your connection before play…'
                : waitingForCloud ? cloudStatus === 'error'
                  ? cloudError ?? 'Cloud sync is unavailable. Please retry before playing.'
                  : 'Syncing your private progress before play…'
                : INTERNET_REQUIRED_MESSAGE}
            </Text>
            {retryFeedback && status === 'offline' && <Text testID="internet-retry-feedback"
              accessibilityLiveRegion="polite" style={styles.retryFeedback}>
              Still offline. Check Wi-Fi or mobile data, then retry.
            </Text>}
            {(checking || (waitingForCloud && cloudStatus !== 'error'))
              && <ActivityIndicator color={P.drop} accessibilityLabel="Checking internet and syncing your private save" />}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: retrying }} disabled={retrying}
              testID="internet-retry" onPress={() => { void retry(); }} style={[styles.retry, retrying && { opacity: 0.6 }]}>
              <Text style={styles.retryText}>{retrying ? 'Checking…' : 'Retry'}</Text>
            </Pressable>
            <Text style={styles.note}>Your scores and progress sync privately for this installation. No account is required.</Text>
            <Pressable accessibilityRole="link" testID="internet-privacy" onPress={() => router.push('/privacy')} style={styles.privacy}>
              <Text style={styles.link}>Privacy policy</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,39,92,0.9)', padding: 16 },
  card: { width: '100%', maxWidth: 420, backgroundColor: P.paper, borderWidth: 3, borderColor: P.ink, borderRadius: R.card, overflow: 'hidden' },
  scroll: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  content: { padding: 20, gap: 12, alignItems: 'center' },
  title: { fontFamily: F.bold, fontSize: 25, color: P.ink, textAlign: 'center' },
  body: { fontFamily: F.medium, fontSize: 17, lineHeight: 24, color: P.ink, textAlign: 'center' },
  retryFeedback: { fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: P.inkSoft, textAlign: 'center' },
  retry: { alignSelf: 'stretch', minHeight: 48, padding: 12, borderRadius: R.btn, backgroundColor: P.drop, borderColor: P.ink, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontFamily: F.bold, fontSize: 18, color: P.white },
  note: { fontFamily: F.medium, fontSize: 14, color: P.inkSoft, textAlign: 'center' },
  privacy: { minHeight: 44, justifyContent: 'center' },
  link: { fontFamily: F.semi, fontSize: 15, color: P.ink, textDecorationLine: 'underline' },
});
