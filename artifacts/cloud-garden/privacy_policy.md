# Slice & Bloom Privacy Policy

**Developer:** Game Villa  
**Support:** [contact.gamevilla@gmail.com](mailto:contact.gamevilla@gmail.com)  
**Last updated:** October 19, 2026

This policy explains what Slice & Bloom stores on your device, what is synced
to Game Villa for your private installation, and how advertising works.

## Internet access required

An active internet connection is required to start and continue gameplay.
Connection loss pauses puzzles behind an internet-required message. Retrying
checks the connection again; it does not erase your local saves. The privacy
policy can be read without passing the gameplay connection check.

The app checks device network status and makes small connectivity requests at
launch, before level starts/retries, when returning to the foreground, and
periodically while active. Native builds use Google's connectivity endpoint
at `clients3.google.com/generate_204`; browsers check the game's current host.
The game also contacts its API over HTTPS to retrieve and save progress.
Connectivity and API services can process ordinary connection information,
such as your IP address, request headers and request time. The game does not
request Wi-Fi network names or location permission for these checks.

## Game data and private installation sync

Settings, reward inventory and a local progress cache remain on your device.
Level unlocks, stars, high scores and best completion times are sent over
HTTPS to Game Villa and saved to a private record for this app installation.
The API stores a random installation identifier, a one-way hash of the
private access token, progress records, and creation/update timestamps. It
does not receive your name, email address or account credentials.

No account is required. The save is private to this installation: it is not a
public leaderboard and does not sync across devices. The access token is kept
in Android/iOS secure storage; on the web it is kept in browser storage.
Reinstalling the app, clearing secure storage, or clearing browser data can
remove access to that installation's cloud record. Do not use this feature as
the only copy of important information.

## Advertising and consent

Where ads are available, the game uses Google Mobile Ads and Google's consent
tools. Ads may include banners, interstitials after eligible wins, and optional
rewarded videos. Rewarded items are granted by the game only after the ad
reports a completed reward.
Reward credit also waits for the ad to close. Losing connectivity does not
itself grant a reward. An ad without an earned-reward callback grants nothing;
a legitimate earned receipt can still be credited after close if the
connection drops.

Ad requests are configured as non-personalized. Google may still process
information such as device or advertising identifiers, IP address, consent
choices, and ad or diagnostic events to provide, secure, and measure its
services. Google's handling of that information is described in its own
[Privacy Policy](https://policies.google.com/privacy).

## Analytics and sharing

The game does not include a separate gameplay analytics service or public
leaderboard. Progress is sent to Game Villa solely to maintain the private
installation save described above. Google receives the information needed for
its advertising and consent services when those services are used. If you
choose to email support, your email app handles the message.

## Your choices

An internet connection is required even if you do not choose to watch a
rewarded video. Ad availability is not guaranteed by connectivity. Clearing
the app's storage or browser data removes the local cache and access token, but
does not necessarily erase the server-side record. To request deletion of that
record, contact Game Villa at the address below and include the installation
identifier shown in the app's Privacy page. Clearing local game data also
removes local progress and reward items. Google's consent choices apply to ad
requests on that device.

## Contact

Questions about this policy or the game? Contact Game Villa at
[contact.gamevilla@gmail.com](mailto:contact.gamevilla@gmail.com).

This policy describes the current version of Slice & Bloom. If the app's data
practices change, this policy will be updated.
