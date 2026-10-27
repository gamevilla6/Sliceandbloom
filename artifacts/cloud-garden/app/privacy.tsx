import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { F, P, R } from '@/constants/theme';
import { useCloudSync } from '@/components/CloudSyncProvider';
import appConfig from '../app.json';

const { developerName, supportEmail } = appConfig.expo.extra;
const lastUpdated = 'October 19, 2026';
const GOOGLE_PRIVACY_URL = 'https://policies.google.com/privacy';

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cloud = useCloudSync();
  const horizontalPadding = width < 420 ? 18 : 28;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safe} testID="privacy-policy-page">
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Slice & Bloom"
          testID="privacy-back"
          onPress={goBack}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={P.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator
      >
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>SLICE & BLOOM · {developerName.toUpperCase()}</Text>
          <Text style={styles.title}>Privacy policy</Text>
          <Text style={styles.updated}>Last updated {lastUpdated}</Text>
          <Text style={styles.lede}>
            This page explains what Slice & Bloom stores on your device and how advertising works in the game.
          </Text>
        </View>

        <PolicySection title="Internet access required">
          <Text style={styles.body}>
            An active internet connection is required to start and continue gameplay. Connection loss pauses puzzles behind an internet-required message. Retry checks your connection again without erasing saved progress. This policy remains accessible without passing that check.
          </Text>
          <Text style={[styles.body, styles.paragraphGap]}>
            The app checks network status at launch, before level starts and retries, when returning to the foreground, and periodically while active. It requests a small HTTPS health check from the configured game API. The game may also contact an optional private-save endpoint. These services can process ordinary connection information such as IP address, request headers and request time. No Wi-Fi network names or location permission are requested.
          </Text>
        </PolicySection>
        <PolicySection title="Game data and optional private sync">
          <Text style={styles.body}>
            Progress, settings and reward inventory are saved on your device. When available, the game may sync level unlocks, stars, high scores and best times over HTTPS to a private record for this app installation. Sync is optional and best-effort: an unavailable endpoint or 404 does not erase local progress or block gameplay after the internet check succeeds. A record, if created, contains a random installation ID, a one-way hash of its access token, progress records and timestamps—not your name, email or account credentials. No account is required. This is not a public leaderboard and does not sync across devices. Android and iOS keep the access token in secure storage; web browsers keep it in browser storage. Reinstalling or clearing that storage removes access to the remote record.
          </Text>
          <Text style={[styles.body, styles.paragraphGap]}>
            Installation ID for a deletion request:
          </Text>
          <Text selectable style={styles.installationId} testID="privacy-installation-id">
            {cloud.installationId ?? 'No private cloud record is currently available'}
          </Text>
        </PolicySection>

        <PolicySection title="Advertising and consent">
          <Text style={styles.body}>
            Where ads are available, the game uses Google Mobile Ads and Google’s consent tools. Ads may include banners, interstitials after eligible wins, and optional rewarded videos. Rewarded items are granted only after the SDK reports an earned reward and the ad closes. Losing connectivity does not itself grant an item. An ad without an earned-reward callback grants nothing; a legitimate earned receipt can still be credited after close if the connection drops.
          </Text>
          <Text style={[styles.body, styles.paragraphGap]}>
            Ad requests are configured as non-personalized. Google may still process information such as device or advertising identifiers, IP address, consent choices, and ad or diagnostic events to provide, secure and measure its services. Google’s handling of that information is described in its own privacy policy.
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Read Google's privacy policy"
            testID="google-privacy-link"
            onPress={() => { void Linking.openURL(GOOGLE_PRIVACY_URL); }}
          >
            <Text style={styles.link}>Google Privacy Policy</Text>
          </Pressable>
        </PolicySection>

        <PolicySection title="Analytics and sharing">
          <Text style={styles.body}>
            The game does not include a separate gameplay analytics service or public leaderboard. Progress is sent to Game Villa only when the optional private sync service is available. Google receives the information needed for its advertising and consent services when those services are used. If you choose to email support, your email app handles the message.
          </Text>
        </PolicySection>

        <PolicySection title="Your choices">
          <Text style={styles.body}>
            An internet connection is required even if you do not choose to watch a rewarded video. Ad availability is not guaranteed by connectivity. Clearing app or browser storage removes local progress, rewards and any stored access token, but does not necessarily erase a remote record if one was created. To request server-side deletion, email support with the installation ID shown on this page. Google’s consent choices apply to ad requests on that device.
          </Text>
        </PolicySection>

        <PolicySection title="Contact">
          <Text style={styles.body}>
            Questions about this policy or the game? Contact {developerName} at:
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Email ${supportEmail}`}
            testID="privacy-support-email"
            onPress={() => {
              void Linking.openURL(`mailto:${supportEmail}?subject=${encodeURIComponent('Slice & Bloom privacy question')}`);
            }}
          >
            <Text selectable style={[styles.link, styles.email]}>{supportEmail}</Text>
          </Pressable>
        </PolicySection>

        <Text style={styles.footer}>
          This policy describes the current version of Slice & Bloom. If the app’s data practices change, this page will be updated.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: P.paper },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: P.paperDeep,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontFamily: F.bold, color: P.ink, fontSize: 19 },
  headerSpacer: { width: 44 },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 800, alignSelf: 'center', paddingTop: 28, paddingBottom: 44 },
  intro: {
    padding: 22,
    marginBottom: 20,
    backgroundColor: P.white,
    borderColor: P.ink,
    borderWidth: 3,
    borderRadius: R.card,
  },
  eyebrow: { fontFamily: F.bold, color: P.dropDeep, fontSize: 11, letterSpacing: 1.1 },
  title: { fontFamily: F.bold, color: P.ink, fontSize: 30, marginTop: 8 },
  updated: { fontFamily: F.medium, color: P.inkSoft, fontSize: 13, marginTop: 3 },
  lede: { fontFamily: F.regular, color: P.ink, fontSize: 16, lineHeight: 23, marginTop: 16 },
  section: {
    padding: 18,
    marginBottom: 14,
    backgroundColor: P.white,
    borderColor: P.paperDeep,
    borderWidth: 2,
    borderRadius: R.card,
  },
  sectionTitle: { fontFamily: F.bold, color: P.ink, fontSize: 18, marginBottom: 8 },
  body: { fontFamily: F.regular, color: P.inkSoft, fontSize: 15, lineHeight: 22 },
  paragraphGap: { marginTop: 12 },
  link: {
    fontFamily: F.semi,
    color: P.dropDeep,
    fontSize: 15,
    lineHeight: 22,
    textDecorationLine: 'underline',
    marginTop: 10,
  },
  email: { fontSize: 17, marginTop: 7 },
  installationId: { fontFamily: F.medium, color: P.ink, fontSize: 13, lineHeight: 19, marginTop: 6 },
  footer: {
    fontFamily: F.regular,
    color: P.inkSoft,
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 4,
    marginTop: 4,
    textAlign: 'center',
  },
});
