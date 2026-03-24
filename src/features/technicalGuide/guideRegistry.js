/**
 * Single source of topic slugs and categories for Teknik Rehber.
 * Zengin içerik: `content/<name>Guide.js` + `content/index.js` içinde RICH_GUIDE_BY_I18N_KEY.
 */
export const GUIDE_CATEGORY = {
  camera: 'camera',
  alarm: 'alarm',
};

/** @type {Array<{ slug: string, category: keyof typeof GUIDE_CATEGORY, i18nKey: string, layout?: 'simple' | 'rich' }>} */
export const GUIDE_TOPICS = [
  {
    slug: 'port-forwarding',
    category: 'camera',
    i18nKey: 'portForwarding',
    layout: 'rich',
  },
  {
    slug: 'hik-connect-ivms4200',
    category: 'camera',
    i18nKey: 'hikConnectIvms',
    layout: 'rich',
  },
  {
    slug: 'p2p-karekod-kurulum',
    category: 'camera',
    i18nKey: 'p2pQrSetup',
    layout: 'rich',
  },
];

export function getTopicBySlug(slug) {
  return GUIDE_TOPICS.find((t) => t.slug === slug) ?? null;
}

export function getTopicsByCategory(category) {
  return GUIDE_TOPICS.filter((t) => t.category === category);
}
