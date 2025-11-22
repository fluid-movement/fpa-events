<script lang="ts">
    import LogoDark from "$lib/assets/fpa-logo-dark.png";
    import LogoLight from "$lib/assets/fpa-logo-light.png";
    
    import { mode } from "mode-watcher";
    
    
</script>

<img src={ mode.current === 'dark' ? LogoDark : LogoLight } alt="FPA Logo" class="w-auto" />