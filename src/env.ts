// Deployment context shared by pages and client scripts.

/** "preview" for PR preview builds, "production" otherwise. */
export const deployEnv: 'preview' | 'production' =
  import.meta.env.PUBLIC_DEPLOY_ENV === 'preview' ? 'preview' : 'production';

export const isPreview = deployEnv === 'preview';

/**
 * Prefix for localStorage keys. Production and every PR preview share one origin
 * (aew2sbee.github.io), so keys are namespaced by base path to keep data separate.
 */
export const storagePrefix = `working-cars-maze@${import.meta.env.BASE_URL}:`;
