<script lang="ts">
	import { mode } from 'mode-watcher';

	// todo find out mode during ssr
	let logo = $derived(mode.current === 'dark' ? '/fpa-logo-dark.png' : '/fpa-logo-light.png');
</script>

<img src={logo} alt="FPA Logo" class="w-auto" />