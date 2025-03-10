/// <reference types="astro/client" />

interface ImportMetaEnv {
    readonly SHOPIFY_DOMAIN: string;
    readonly SHOPIFY_ACCESS_TOKEN: string;
    // more env variables...
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }