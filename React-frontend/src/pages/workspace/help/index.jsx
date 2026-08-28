import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { helpApi } from './api/help.api';
import { Container } from '@/components/common/container';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { KnowledgeHero } from './components/knowledge-hero';
import { KnowledgeCategories } from './components/knowledge-categories';
import { KnowledgeFaqList } from './components/knowledge-faq-list';
import { KnowledgeGuides } from './components/knowledge-guides';
import { KnowledgeRecent } from './components/knowledge-recent';
import { KnowledgeGettingStarted } from './components/knowledge-getting-started';
import { KnowledgeQuickActions } from './components/knowledge-quick-actions';
import { KnowledgeShortcuts } from './components/knowledge-shortcuts';
import { getDefaultHelpContent, QUICK_TOPICS } from './constants/help-content';

function norm(s) {
  return (s || '').toLowerCase().trim();
}

function matchesQuery(keywords, text, q) {
  if (!q) return true;
  const kw = norm(keywords);
  const body = norm(text);
  return kw.includes(q) || body.includes(q);
}

function mergeGuideSections(apiSections, defaults) {
  const merged = { ...defaults };
  for (const [key, articles] of Object.entries(apiSections || {})) {
    if (Array.isArray(articles) && articles.length) {
      merged[key] = articles;
    }
  }
  return merged;
}

function mergeFaqs(apiFaqs, defaults) {
  if (!Array.isArray(apiFaqs) || apiFaqs.length === 0) return defaults;
  const seen = new Set(apiFaqs.map((f) => norm(f.q)));
  const extra = defaults.filter((f) => !seen.has(norm(f.q)));
  return [...apiFaqs, ...extra];
}

function KnowledgeSkeleton() {
  return (
    <Container className="max-w-none pb-12">
      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        <div className="col-span-12 space-y-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-5 w-96 max-w-full" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-28 rounded-full" />
            ))}
          </div>
        </div>
        <div className="col-span-12 grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </Container>
  );
}

export function WorkspaceHelpPage({ accountOwner = false }) {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const base = accountOwner ? '/' : `/workspace/${workspaceId}`;

  const defaults = useMemo(() => getDefaultHelpContent(accountOwner), [accountOwner]);

  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [activeCategory, setActiveCategory] = useState(() => searchParams.get('category') || 'all');
  const [activeTopic, setActiveTopic] = useState(() => searchParams.get('topic') || null);
  const [activeKnowledgeId, setActiveKnowledgeId] = useState(null);
  const [recentRefresh, setRecentRefresh] = useState(0);
  const [ownerCompanies, setOwnerCompanies] = useState([]);
  const [sectionLabels, setSectionLabels] = useState(defaults.section_labels);
  const [guideSections, setGuideSections] = useState(defaults.guide_sections);
  const [faqs, setFaqs] = useState(defaults.faqs);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = accountOwner ? await helpApi.getAccount() : await helpApi.get();
      const data = res.data?.data || {};
      setOwnerCompanies(data.owner_companies || []);
      setSectionLabels({ ...defaults.section_labels, ...(data.section_labels || {}) });
      setGuideSections(mergeGuideSections(data.guide_sections, defaults.guide_sections));
      setFaqs(mergeFaqs(data.faqs, defaults.faqs));
    } catch {
      setOwnerCompanies([]);
      setSectionLabels(defaults.section_labels);
      setGuideSections(defaults.guide_sections);
      setFaqs(defaults.faqs);
    } finally {
      setLoading(false);
    }
  }, [accountOwner, defaults]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const q = searchParams.get('q');
    const category = searchParams.get('category');
    const topic = searchParams.get('topic');
    if (q != null) setSearch(q);
    if (category) setActiveCategory(category);
    if (topic) setActiveTopic(topic);
  }, [searchParams]);

  const q = norm(search);

  const topicQuery = useMemo(() => {
    if (!activeTopic) return '';
    const topic = QUICK_TOPICS.find((t) => t.id === activeTopic);
    return topic?.keywords || topic?.label || '';
  }, [activeTopic]);

  const effectiveQuery = q || norm(topicQuery);
  const hasFilters = Boolean(search || activeTopic || activeCategory !== 'all');

  const filteredFaqs = useMemo(() => {
    let list = faqs || [];
    if (activeCategory !== 'all') {
      list = list.filter((faq) => faq.category === activeCategory);
    }
    if (!effectiveQuery) return list;
    return list.filter((faq) =>
      matchesQuery(`${faq.keywords || ''} ${faq.q || ''}`, faq.a, effectiveQuery),
    );
  }, [faqs, activeCategory, effectiveQuery]);

  const filteredGuides = useMemo(() => {
    const out = {};
    for (const [key, articles] of Object.entries(guideSections)) {
      const visible = (articles || []).filter((article) =>
        matchesQuery(
          `${article.keywords || ''} ${article.title || ''}`,
          article.body,
          effectiveQuery,
        ),
      );
      if (visible.length) out[key] = visible;
    }
    return out;
  }, [guideSections, effectiveQuery]);

  const hasGuideResults = Object.keys(filteredGuides).length > 0;

  const syncUrl = useCallback(
    (patch) => {
      const next = new URLSearchParams(searchParams);
      if (patch.q !== undefined) {
        if (patch.q) next.set('q', patch.q);
        else next.delete('q');
      }
      if (patch.topic !== undefined) {
        if (patch.topic) next.set('topic', patch.topic);
        else next.delete('topic');
      }
      if (patch.category !== undefined) {
        if (patch.category && patch.category !== 'all') next.set('category', patch.category);
        else next.delete('category');
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleRestartTour = async () => {
    if (accountOwner) {
      const firstCompany = ownerCompanies[0];
      if (firstCompany?.id) {
        navigate(`/workspace/${firstCompany.id}/help`);
      } else {
        toast.info('Create or open a company workspace first to run the tour.');
      }
      return;
    }

    setRestarting(true);
    try {
      await helpApi.restartTour();
      toast.success('Tour reset. Opening dashboard…');
      navigate(base);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not reset the tour.');
    } finally {
      setRestarting(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setActiveTopic(null);
    setActiveCategory('all');
    setActiveKnowledgeId(null);
    syncUrl({ q: '', topic: '', category: 'all' });
  };

  const handlePopularSearch = ({ query, topic }) => {
    setSearch(query);
    setActiveTopic(topic || null);
    setActiveCategory('all');
    syncUrl({ q: query, topic: topic || '', category: 'all' });
  };

  const handleCategorySelect = (faqCategory, topic, knowledgeId) => {
    setActiveCategory(faqCategory);
    setActiveTopic(topic || null);
    setActiveKnowledgeId(knowledgeId || null);
    if (topic) setSearch('');
    syncUrl({ category: faqCategory, topic: topic || '', q: topic ? '' : search });
  };

  const handleGettingStartedAction = (item) => {
    if (item.action === 'tour') {
      handleRestartTour();
      return;
    }
    if (item.action === 'shortcuts') {
      document.getElementById('help-shortcuts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (item.query) {
      setSearch(item.query);
      setActiveTopic(item.topic || null);
      setActiveCategory('all');
      syncUrl({ q: item.query, topic: item.topic || '', category: 'all' });
    }
  };

  const handleQuickAction = (action) => {
    if (action.query) {
      setSearch(action.query);
      setActiveCategory('all');
      syncUrl({ q: action.query, category: 'all' });
      return;
    }
    if (action.href?.startsWith('#')) {
      document.querySelector(action.href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) {
    return <KnowledgeSkeleton />;
  }

  return (
    <Container className="max-w-none pb-12">
      <div className="flex flex-wrap items-center justify-end gap-2 mb-6">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={restarting || (accountOwner && ownerCompanies.length === 0)}
          onClick={handleRestartTour}
        >
          {restarting ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
          {accountOwner ? 'Workspace tour' : 'Run tour again'}
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to={base}>
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        <KnowledgeHero
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            if (value) setActiveTopic(null);
            syncUrl({ q: value, topic: value ? '' : activeTopic });
          }}
          onClear={handleClearFilters}
          hasFilters={hasFilters}
          onPopularSearch={handlePopularSearch}
          accountOwner={accountOwner}
        />

        <KnowledgeCategories
          faqs={faqs}
          guideSections={guideSections}
          activeKnowledgeId={activeKnowledgeId}
          onCategorySelect={handleCategorySelect}
        />

        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <KnowledgeFaqList
            faqs={filteredFaqs}
            activeCategory={activeCategory}
            onCategoryChange={(cat) => {
              setActiveCategory(cat);
              syncUrl({ category: cat });
            }}
            searchQuery={effectiveQuery}
            onArticleOpen={() => setRecentRefresh((n) => n + 1)}
          />

          {hasGuideResults ? (
            <KnowledgeGuides
              guideSections={filteredGuides}
              sectionLabels={sectionLabels}
              onArticleOpen={() => setRecentRefresh((n) => n + 1)}
            />
          ) : null}
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <KnowledgeRecent refreshKey={recentRefresh} />
          <KnowledgeGettingStarted onAction={handleGettingStartedAction} />
          <KnowledgeQuickActions onAction={handleQuickAction} />
          <KnowledgeShortcuts />
        </div>
      </div>
    </Container>
  );
}
