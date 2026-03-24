import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Bell, Video } from 'lucide-react';
import { PageContainer, PageHeader } from '../../components/layout';
import { cn } from '../../lib/utils';
import { getRichGuideCardSummary, getRichGuideTitle } from './content';
import { GUIDE_CATEGORY, getTopicsByCategory } from './guideRegistry';

const CATEGORY_ICONS = {
  [GUIDE_CATEGORY.camera]: Video,
  [GUIDE_CATEGORY.alarm]: Bell,
};

function CategoryBlock({ categoryId }) {
  const { t } = useTranslation('technicalGuide');
  const topics = getTopicsByCategory(categoryId);
  const Icon = CATEGORY_ICONS[categoryId] ?? Video;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-[#262626] dark:text-neutral-200">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          {t(`categories.${categoryId}`)}
        </h2>
      </div>
      {topics.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('list.emptyCategory')}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {topics.map((topic) => {
            const title = getRichGuideTitle(topic.i18nKey) || t(`topics.${topic.i18nKey}.title`);
            const summary = getRichGuideCardSummary(topic.i18nKey);
            return (
              <li key={topic.slug}>
                <Link
                  to={`/technical-guide/${topic.slug}`}
                  className={cn(
                    'group flex h-full min-h-[10.5rem] flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all',
                    'dark:border-[#262626] dark:bg-[#171717]',
                    'hover:border-primary-500/60 hover:shadow-md dark:hover:border-primary-500/50'
                  )}
                >
                  <h3 className="text-base font-semibold leading-snug text-neutral-900 line-clamp-2 dark:text-neutral-50">
                    {title}
                  </h3>
                  {summary ? (
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-600 line-clamp-3 dark:text-neutral-400">
                      {summary}
                    </p>
                  ) : (
                    <div className="flex-1" />
                  )}
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400">
                    {t('list.readMore')}
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function TechnicalGuideListPage() {
  const { t } = useTranslation('technicalGuide');

  return (
    <PageContainer maxWidth="full" padding="default" className="space-y-6">
      <PageHeader title={t('title')} description={t('listDescription')} />
      <div className="space-y-12">
        <CategoryBlock categoryId={GUIDE_CATEGORY.camera} />
        <CategoryBlock categoryId={GUIDE_CATEGORY.alarm} />
      </div>
    </PageContainer>
  );
}
