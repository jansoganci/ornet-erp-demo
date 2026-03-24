import { hikConnectIvmsGuide } from './hikConnectIvmsGuide';
import { p2pQrSetupGuide } from './p2pQrSetupGuide';
import { portForwardingGuide } from './portForwardingGuide';

/** Zengin rehber içerikleri (i18nKey → veri). Yeni konu: buraya ekle. */
export const RICH_GUIDE_BY_I18N_KEY = {
  portForwarding: portForwardingGuide,
  hikConnectIvms: hikConnectIvmsGuide,
  p2pQrSetup: p2pQrSetupGuide,
};

export function getRichGuideContent(i18nKey) {
  return RICH_GUIDE_BY_I18N_KEY[i18nKey] ?? null;
}

export function getRichGuideTitle(i18nKey) {
  return RICH_GUIDE_BY_I18N_KEY[i18nKey]?.title ?? '';
}

/** Liste kartı için kısa özet; yoksa boş string. */
export function getRichGuideCardSummary(i18nKey) {
  return RICH_GUIDE_BY_I18N_KEY[i18nKey]?.cardSummary ?? '';
}
