import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PressScale } from './GameUi';
import { F, P, R } from '@/constants/theme';

/** Presentation only: the screen owns pause state and the SDK owns rewards. */
export function SmartHintPrompt({ visible, busy, supported, message, onWatch, onClose }: {
  visible: boolean; busy: boolean; supported: boolean; message?: string;
  onWatch: () => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.backdrop}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card} accessibilityViewIsModal testID="smart-hint-prompt">
            <Ionicons name="bulb" size={36} color={P.marigold} />
            <Text style={styles.title}>Expert slice hint</Text>
            <Text style={styles.copy}>Stuck on this puzzle? Watch a quick video to reveal the expert slice path hint!</Text>
            <Text style={styles.copy}>Your puzzle is paused. No ink or time is used while you decide.</Text>
            {!supported && <Text style={styles.copy}>Rewarded ads require the native Android or iOS app. Hints cannot be unlocked through ads in this browser.</Text>}
            {!!message && <Text accessibilityLiveRegion="polite" style={styles.copy}>{message}</Text>}
            <PressScale label={busy ? 'Loading rewarded video' : 'Watch Ad'} testID="hint-watch-ad" disabled={busy || !supported} onPress={onWatch} style={styles.watch}>
              <Text style={styles.buttonText}>{busy ? 'Loading video…' : 'Watch Ad'}</Text>
            </PressScale>
            <PressScale label="Cancel hint and resume puzzle" testID="hint-cancel" onPress={onClose} style={styles.cancel}>
              <Text style={styles.buttonText}>Back to puzzle</Text>
            </PressScale>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: P.ink },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 420, backgroundColor: P.paper, borderRadius: R.btn, padding: 24, gap: 16, alignItems: 'center' },
  title: { fontFamily: F.bold, fontSize: 24, color: P.ink, textAlign: 'center' },
  copy: { fontFamily: F.semi, fontSize: 16, color: P.ink, textAlign: 'center' },
  watch: { minHeight: 48, padding: 12, backgroundColor: P.marigold, borderRadius: R.btn, alignSelf: 'stretch', alignItems: 'center' },
  cancel: { minHeight: 48, padding: 12, alignItems: 'center' },
  buttonText: { fontFamily: F.bold, fontSize: 16, color: P.ink },
});
