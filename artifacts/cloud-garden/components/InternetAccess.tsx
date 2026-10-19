import React, { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { ActivityIndicator, AppState, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { InternetAccess, type InternetStatus } from '@/lib/internetAccess';
import { useCloudSync } from '@/components/CloudSyncProvider';
import { F, P, R } from '@/constants/theme';

const NATIVE_PROBE = 'https://clients3.google.com/generate_204';
export const INTERNET_REQUIRED_MESSAGE = 'Internet connection required! Please connect to Wi-Fi or mobile data to play Slice & Bloom.';

/** A real HTTP response, not just a Wi-Fi icon. No saves/identifiers are sent. */
async function probeInternet() {
  if (Platform.OS === 'web' && navigator.onLine === false) return false;
  const url = new URL(Platform.OS === 'web' ? window.location.href : NATIVE_PROBE);
  url.hash = '';
  url.searchParams.set('online_check', String(Date.now()));
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 6000);
  try {
    const response = await fetch(url.toString(), {
      method: 'HEAD', cache: 'no-store', redirect: 'error', signal: abort.signal,
    });
    // Captive portal HTML/redirects do not satisfy the native 204 check.
    return response.status === (Platform.OS === 'web' ? 200 : 204);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

type InternetContextValue = {
  status: InternetStatus;
  online: boolean;
  check: (blocking?: boolean) => Promise<boolean>;
  isOnline: () => boolean;
};
const InternetContext = createContext<InternetContextValue | null>(null);

export function InternetProvider({ children }: { children: React.ReactNode }) {
  const monitor = useMemo(() => new InternetAccess(probeInternet), []);
  const { status } = useSyncExternalStore(monitor.subscribe, monitor.getSnapshot, monitor.getSnapshot);
  useEffect(() => {
    let active = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    // Native/OS network events are hints; our bounded probe proves reachability.
    // Disable NetInfo's additional JS polling to avoid duplicate network traffic.
    NetInfo.configure({ reachabilityShouldRun: () => false, shouldFetchWiFiSSID: false });
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
      if (active) void monitor.check(true);
      else monitor.suspend();
    });
    const timer = setInterval(() => {
      if (active) void monitor.check();
    }, 15000);
    return () => {
      unsubscribe();
      subscription.remove();
      clearInterval(timer);
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

export function InternetRequiredModal() {
  const { status, check } = useInternetAccess();
  const cloud = useCloudSync();
  const pathname = usePathname();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const checking = status === 'checking';
  const waitingForCloud = status === 'online' && cloud.status !== 'ready';
  const visible = (status !== 'online' || !cloud.playReady) && pathname !== '/privacy';
  const retry = async () => {
    if (await check(true)) await cloud.retry();
  };
  // Privacy can always be read. Gameplay remains paused behind that route.
  return (
    <Modal visible={visible} transparent animationType="fade"
      statusBarTranslucent onRequestClose={() => {}}>
      <SafeAreaView style={styles.scrim}>
        <View style={[styles.card, { height: Math.max(0, Math.min(440, height - insets.top - insets.bottom - 32)) }]}
          testID="internet-required-modal" accessibilityViewIsModal>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <Ionicons name="wifi" size={44} color={P.drop} />
            <Text accessibilityRole="header" style={styles.title}>
              {checking ? 'Checking internet…' : waitingForCloud ? 'Syncing private save…' : 'Internet required'}
            </Text>
            <Text accessibilityLiveRegion="polite" style={styles.body}>
              {checking ? 'Checking your connection before play…'
                : waitingForCloud ? cloud.status === 'error'
                  ? cloud.error ?? 'Cloud sync is unavailable. Please retry before playing.'
                  : 'Syncing your private progress before play…'
                : INTERNET_REQUIRED_MESSAGE}
            </Text>
            {(checking || (waitingForCloud && cloud.status !== 'error'))
              && <ActivityIndicator color={P.drop} accessibilityLabel="Checking internet and syncing your private save" />}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: checking }} disabled={checking}
              testID="internet-retry" onPress={() => { void retry(); }} style={[styles.retry, checking && { opacity: 0.6 }]}>
              <Text style={styles.retryText}>{checking ? 'Checking…' : 'Retry'}</Text>
            </Pressable>
            <Text style={styles.note}>Your scores and progress sync privately for this installation. No account is required.</Text>
            <Pressable accessibilityRole="link" testID="internet-privacy" onPress={() => router.push('/privacy')} style={styles.privacy}>
              <Text style={styles.link}>Privacy policy</Text>
            </Pressable>
          </ScrollView>
        </View>
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
  retry: { alignSelf: 'stretch', minHeight: 48, padding: 12, borderRadius: R.btn, backgroundColor: P.drop, borderColor: P.ink, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontFamily: F.bold, fontSize: 18, color: P.white },
  note: { fontFamily: F.medium, fontSize: 14, color: P.inkSoft, textAlign: 'center' },
  privacy: { minHeight: 44, justifyContent: 'center' },
  link: { fontFamily: F.semi, fontSize: 15, color: P.ink, textDecorationLine: 'underline' },
});
