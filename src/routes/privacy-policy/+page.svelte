<script lang="ts">
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
</script>

<PageShell width="form" class="space-y-8">
	<PageHeader title="Privacy Policy" description="Last updated: June 2026" class="pb-0" />

	<section class="space-y-3">
		<h2>1. Controller</h2>
		<p class="text-sm text-muted-foreground">
			The controller responsible for data processing on this website within the meaning of the
			General Data Protection Regulation (GDPR) is:
		</p>
		<p class="text-sm">
			<!-- TODO: Replace with operator name -->
			<strong>[OPERATOR NAME]</strong><br />
			<!-- TODO: Replace with address -->
			[ADDRESS]<br />
			<!-- TODO: Replace with contact email -->
			Email: <a href="mailto:[CONTACT EMAIL]" class="underline">[CONTACT EMAIL]</a>
		</p>
	</section>

	<section class="space-y-3">
		<h2>2. Data We Collect</h2>

		<div class="space-y-4 text-sm text-muted-foreground">
			<div>
				<h3 class="font-medium text-foreground">Account data</h3>
				<p>
					When you register, we collect your name and email address. This data is necessary to
					create and manage your account. The legal basis is the performance of a contract (GDPR
					Art. 6(1)(b)).
				</p>
			</div>

			<div>
				<h3 class="font-medium text-foreground">Profile image</h3>
				<p>
					You may optionally upload a profile image. Images are stored on Cloudflare R2 object
					storage. The legal basis is your consent (GDPR Art. 6(1)(a)), which you can withdraw at
					any time by removing the image from your profile.
				</p>
			</div>

			<div>
				<h3 class="font-medium text-foreground">Event participation</h3>
				<p>
					When you RSVP to or organize events, we store your participation status. Your name and
					profile image are shown to other users on event attendee lists. The legal basis is the
					performance of a contract (GDPR Art. 6(1)(b)).
				</p>
			</div>

			<div>
				<h3 class="font-medium text-foreground">Session and security data</h3>
				<p>
					When you log in, we create a session record that includes your IP address and browser user
					agent. This is used to maintain your login and to detect unauthorized access. The legal
					basis is our legitimate interest in securing the service (GDPR Art. 6(1)(f)). Sessions
					expire automatically and are deleted when you log out.
				</p>
			</div>
		</div>
	</section>

	<section class="space-y-3">
		<h2>3. Cookies</h2>
		<p class="text-sm text-muted-foreground">
			This website uses only strictly necessary cookies for authentication (session token). These
			cookies are essential for the login functionality and are exempt from consent requirements
			under the ePrivacy Directive. We do not use analytics, tracking, or advertising cookies.
		</p>
	</section>

	<section class="space-y-3">
		<h2>4. Third-Party Services</h2>

		<div class="space-y-4 text-sm text-muted-foreground">
			<div>
				<h3 class="font-medium text-foreground">Hetzner (Hosting)</h3>
				<p>
					This website is hosted on servers operated by Hetzner Online GmbH, Industriestr. 25, 91710
					Gunzenhausen, Germany. All data is stored within the European Union. Hetzner acts as a
					data processor under a Data Processing Agreement (GDPR Art. 28). See Hetzner's privacy
					policy at <a href="https://www.hetzner.com/legal/privacy-policy" class="underline"
						>hetzner.com</a
					>.
				</p>
			</div>

			<div>
				<h3 class="font-medium text-foreground">Cloudflare R2 (Image Storage)</h3>
				<p>
					Profile images and event photos are stored using Cloudflare R2 object storage, operated by
					Cloudflare, Inc. Images are stored in EU regions. See Cloudflare's privacy policy at
					<a href="https://www.cloudflare.com/privacypolicy/" class="underline">cloudflare.com</a>.
				</p>
			</div>

			<div>
				<h3 class="font-medium text-foreground">Komoot Photon (Geocoding)</h3>
				<p>
					When searching for event locations, we send your search query to the Komoot Photon API
					(photon.komoot.io) to suggest city and place names. No personal data beyond the search
					text is transmitted. See Komoot's privacy policy at
					<a href="https://www.komoot.com/privacy" class="underline">komoot.com</a>.
				</p>
			</div>
		</div>
	</section>

	<section class="space-y-3">
		<h2>5. Data Retention</h2>
		<p class="text-sm text-muted-foreground">
			Account data is retained for as long as your account exists. Sessions are deleted on logout or
			when they expire. Password reset tokens expire automatically within a short period. You can
			delete your account at any time from your account settings, which permanently removes all
			personal data associated with your account.
		</p>
	</section>

	<section class="space-y-3">
		<h2>6. Your Rights</h2>
		<p class="text-sm text-muted-foreground">Under GDPR, you have the right to:</p>
		<ul class="list-inside list-disc space-y-1 text-sm text-muted-foreground">
			<li>Access your personal data (Art. 15)</li>
			<li>Correct inaccurate data (Art. 16)</li>
			<li>Request deletion of your data (Art. 17) — available directly via account settings</li>
			<li>Restrict or object to processing (Art. 18, 21)</li>
			<li>Data portability (Art. 20)</li>
			<li>Withdraw consent at any time, where processing is based on consent</li>
		</ul>
		<p class="text-sm text-muted-foreground">
			To exercise any of these rights, contact us at
			<!-- TODO: Replace with contact email -->
			<a href="mailto:[CONTACT EMAIL]" class="underline">[CONTACT EMAIL]</a>.
		</p>
	</section>

	<section class="space-y-3">
		<h2>7. Right to Lodge a Complaint</h2>
		<p class="text-sm text-muted-foreground">
			You have the right to lodge a complaint with a data protection supervisory authority. The
			competent authority in Germany is the Bundesbeauftragte für den Datenschutz und die
			Informationsfreiheit (BfDI).
		</p>
	</section>
</PageShell>
