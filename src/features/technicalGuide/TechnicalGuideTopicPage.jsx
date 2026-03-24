import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GuideArticleLayout } from './components/GuideArticleLayout';
import { RichGuideTopic } from './components/RichGuideTopic';
import { getRichGuideContent } from './content';
import { getTopicBySlug } from './guideRegistry';

export function TechnicalGuideTopicPage() {
  const { slug } = useParams();
  const { t } = useTranslation('technicalGuide');

  const topic = slug ? getTopicBySlug(slug) : null;
  if (!topic) {
    return <Navigate to="/technical-guide" replace />;
  }

  const base = `topics.${topic.i18nKey}`;
  const layout = topic.layout ?? 'simple';
  const richContent = layout === 'rich' ? getRichGuideContent(topic.i18nKey) : null;

  if (layout === 'rich' && richContent) {
    return (
      <GuideArticleLayout title={richContent.title}>
        <RichGuideTopic content={richContent} />
      </GuideArticleLayout>
    );
  }

  if (layout === 'rich' && !richContent) {
    return <Navigate to="/technical-guide" replace />;
  }

  const title = t(`${base}.title`);

  const intro = t(`${base}.intro`, { defaultValue: '' });
  const rawParagraphs = t(`${base}.paragraphs`, { returnObjects: true });
  const paragraphs = Array.isArray(rawParagraphs) ? rawParagraphs : [];

  return (
    <GuideArticleLayout title={title}>
      <div className="space-y-4">
        {intro ? (
          <p className="text-neutral-600 dark:text-neutral-400">{intro}</p>
        ) : null}
        {paragraphs.map((block, index) => (
          <p key={index} className="whitespace-pre-wrap">
            {block}
          </p>
        ))}
      </div>
    </GuideArticleLayout>
  );
}
