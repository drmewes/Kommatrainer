declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    // Cloudflare Access application that protects the deployed site (see HOSTING.md).
    ACCESS_TEAM_DOMAIN?: string;
    ACCESS_AUD?: string;
  }
}
