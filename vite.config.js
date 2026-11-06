// https://vite.dev/config/
export default {
  // GitHub Actions supplies the student's repository name, not the template's.
  base: Deno.env.get("REPO_NAME") ? `/${Deno.env.get("REPO_NAME")}/` : "./",
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: "esnext",
    outDir: "dist",
    // Off: the public site must not expose the private source.
    sourcemap: false,
    // Phaser alone is larger than the default 500 kB warning threshold.
    chunkSizeWarningLimit: 2000,
  },
};
