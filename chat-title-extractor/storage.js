import { DEFAULT_PLATFORMS, DEFAULT_SETTINGS } from './config.js';

export async function getStorage(keys) {
  return chrome.storage.local.get(keys);
}

export async function setStorage(obj) {
  return chrome.storage.local.set(obj);
}

// Initialize storage on first install
export async function initStorage() {
  const { extensionUUID } = await getStorage('extensionUUID');
  if (!extensionUUID) {
    await setStorage({ extensionUUID: crypto.randomUUID() });
  }

  const { platforms } = await getStorage('platforms');
  if (!platforms) {
    await setStorage({ platforms: DEFAULT_PLATFORMS });
  }

  const { customPlatforms } = await getStorage('customPlatforms');
  if (!customPlatforms) {
    await setStorage({ customPlatforms: [] });
  }

  const { settings } = await getStorage('settings');
  if (!settings) {
    await setStorage({ settings: DEFAULT_SETTINGS });
  }
}

export async function getPlatforms() {
  const { platforms } = await getStorage('platforms');
  return platforms || DEFAULT_PLATFORMS;
}

export async function getCustomPlatforms() {
  const { customPlatforms } = await getStorage('customPlatforms');
  return customPlatforms || [];
}

export async function getSettings() {
  const { settings } = await getStorage('settings');
  return { ...DEFAULT_SETTINGS, ...settings };
}

export async function getExtensionUUID() {
  const { extensionUUID } = await getStorage('extensionUUID');
  return extensionUUID;
}

export async function resetAllSettings() {
  await setStorage({
    platforms: DEFAULT_PLATFORMS,
    customPlatforms: [],
    settings: DEFAULT_SETTINGS,
  });
}
