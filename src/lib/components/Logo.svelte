<script lang="ts">
    import { mode } from "mode-watcher";
    
    const logoDark = '/fpa-logo-dark.png';
    const logoLight = '/fpa-logo-light.png';
    
    // todo find out mode during ssr
    let logo = $derived(mode.current === 'dark' ? logoDark : logoLight);
</script>

<img src={ logo } alt="FPA Logo" class="w-auto" />