<script lang="ts">
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
</script>

<PageShell width="form" class="space-y-8">
	<PageHeader title="Privacy Policy" description="Last updated: October 2026" class="pb-0" />

	<section class="space-y-3">
		<h2>1. Who is responsible</h2>
		<p class="text-sm text-muted-foreground">
			This site is run by the Freestyle Players Association (FPA), a nonprofit based in the United
			States. The FPA is the controller for the personal data processed here under the General Data
			Protection Regulation (GDPR):
		</p>
		<p class="text-sm">
			<strong>Freestyle Players Association</strong><br />
			Email:
			<a href="mailto:events@freestyledisc.org" class="underline">events@freestyledisc.org</a>
		</p>
	</section>

	<section class="space-y-3">
		<h2>2. What we collect and why</h2>

		<div class="space-y-4 text-sm text-muted-foreground">
			<div>
				<h3 class="font-medium text-foreground">Your account</h3>
				<p>
					When you sign up we store your name, your email address and your password. The password is
					only stored as a one-way hash; nobody can read it. We use your email address to verify
					your account, to let you reset your password, and to sign you in. Accounts moved over from
					the previous events site keep the name, email address and password hash they had there.
					Legal basis: providing the service you signed up for (GDPR Art. 6(1)(b)).
				</p>
			</div>

			<div>
				<h3 class="font-medium text-foreground">Events you create</h3>
				<p>
					Everything you enter for an event — its name, dates, location, description, schedule,
					venues and the event picture you upload — is published on the event page and visible to
					everyone. Event pictures are stored with Cloudflare R2. Legal basis: Art. 6(1)(b).
				</p>
			</div>

			<div>
				<h3 class="font-medium text-foreground">RSVPs and attendee lists</h3>
				<p>
					When you RSVP to an event we store your status. If you are attending, your name appears on
					the event page, which anyone can see, including visitors who are not signed in. You can
					turn this off under Settings → Privacy: you are then still counted, but not named. The
					event's organizers always see who has signed up. Legal basis: Art. 6(1)(b).
				</p>
			</div>

			<div>
				<h3 class="font-medium text-foreground">Calendar feed</h3>
				<p>
					Your Dashboard and Attending pages offer a personal calendar link listing the events you
					are attending. The link contains a secret code, and anyone who has it can read the feed
					without signing in, so keep it to yourself. Generating a new link makes the old one stop
					working. Legal basis: Art. 6(1)(b).
				</p>
			</div>

			<div>
				<h3 class="font-medium text-foreground">Sign-in and security</h3>
				<p>
					When you sign in we store a session with your IP address and browser type, to keep you
					signed in and to spot misuse of your account. Legal basis: our legitimate interest in a
					secure service (Art. 6(1)(f)).
				</p>
			</div>

			<div>
				<h3 class="font-medium text-foreground">Server logs</h3>
				<p>
					When something goes wrong, our server logs the page, the time and your user ID so we can
					find and fix the error. When the site sends you an email, the log records the address it
					went to. Legal basis: our legitimate interest in running the service reliably (Art.
					6(1)(f)).
				</p>
			</div>
		</div>
	</section>

	<section class="space-y-3">
		<h2>3. Cookies and local storage</h2>
		<p class="text-sm text-muted-foreground">
			We set one cookie, which keeps you signed in, and your browser remembers whether you collapsed
			the sidebar (local storage, <code>sidebar:state</code>). Both are needed for the features you
			use, so they need no consent. We use no analytics, tracking or advertising.
		</p>
	</section>

	<section class="space-y-3">
		<h2>4. Services we use</h2>

		<div class="space-y-4 text-sm text-muted-foreground">
			<div>
				<h3 class="font-medium text-foreground">Hetzner (hosting)</h3>
				<p>
					The site and its database run on servers of Hetzner Online GmbH in Germany, which
					processes the data on our behalf. See
					<a href="https://www.hetzner.com/legal/privacy-policy" class="underline"
						>Hetzner's privacy policy</a
					>.
				</p>
			</div>

			<div>
				<h3 class="font-medium text-foreground">Mailgun (email)</h3>
				<p>
					Account emails (verification and password reset) are sent through Mailgun Technologies,
					Inc., from its EU region. Mailgun receives your email address and the message. See
					<a href="https://www.mailgun.com/legal/privacy-policy/" class="underline"
						>Mailgun's privacy policy</a
					>.
				</p>
			</div>

			<div>
				<h3 class="font-medium text-foreground">Cloudflare (image storage and spam protection)</h3>
				<p>
					Event pictures are stored with Cloudflare R2. The sign-up, sign-in, password reset and
					event forms use Cloudflare Turnstile to tell people from bots: your browser loads it from
					Cloudflare, which receives your IP address and technical details about your browser. It
					sets no tracking cookies. Cloudflare, Inc. is based in the United States. See
					<a href="https://www.cloudflare.com/privacypolicy/" class="underline"
						>Cloudflare's privacy policy</a
					>.
				</p>
			</div>

			<div>
				<h3 class="font-medium text-foreground">OpenStreetMap (maps)</h3>
				<p>
					Maps are drawn from tiles your browser loads directly from the OpenStreetMap Foundation's
					servers, which receive your IP address. See the
					<a href="https://osmfoundation.org/wiki/Privacy_Policy" class="underline"
						>OpenStreetMap privacy policy</a
					>.
				</p>
			</div>

			<div>
				<h3 class="font-medium text-foreground">Komoot Photon (place search)</h3>
				<p>
					When you search for a city or venue, your browser sends the search text to Komoot's Photon
					service (photon.komoot.io), which also receives your IP address. See
					<a href="https://www.komoot.com/privacy" class="underline">Komoot's privacy policy</a>.
				</p>
			</div>
		</div>
		<p class="text-sm text-muted-foreground">
			Where data reaches a provider in the United States, the transfer relies on the EU–US Data
			Privacy Framework or the European Commission's standard contractual clauses.
		</p>
	</section>

	<section class="space-y-3">
		<h2>5. How long we keep it</h2>
		<p class="text-sm text-muted-foreground">
			Your account data stays for as long as your account exists. Sessions end when you sign out or
			after a week without use. Verification and password-reset links expire after a short time.
			Server logs are deleted, at the latest, when the site is next updated. You can delete your
			account at any time under Settings → Account; this removes your account, your sessions, your
			RSVPs and the events you created.
		</p>
	</section>

	<section class="space-y-3">
		<h2>6. Your rights</h2>
		<p class="text-sm text-muted-foreground">Under the GDPR you have the right to:</p>
		<ul class="list-inside list-disc space-y-1 text-sm text-muted-foreground">
			<li>see the data we hold about you (Art. 15)</li>
			<li>have wrong data corrected (Art. 16)</li>
			<li>have your data deleted (Art. 17) — you can delete your account yourself</li>
			<li>restrict or object to processing (Art. 18, 21)</li>
			<li>get your data in a portable format (Art. 20)</li>
		</ul>
		<p class="text-sm text-muted-foreground">
			To use any of these rights, email us at
			<a href="mailto:events@freestyledisc.org" class="underline">events@freestyledisc.org</a>.
		</p>
	</section>

	<section class="space-y-3">
		<h2>7. Complaints</h2>
		<p class="text-sm text-muted-foreground">
			You can complain to a data protection supervisory authority, in particular the one in the EU
			country where you live.
		</p>
	</section>
</PageShell>
