import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { FAQ_CATEGORIES } from '../constants/help-content';

function categoryLabel(id) {
  return FAQ_CATEGORIES.find((c) => c.id === id)?.label || id;
}

export function HelpFaqCard({ faqs, activeCategory, onCategoryChange, searchQuery }) {
  const categoriesWithFaqs = FAQ_CATEGORIES.filter(
    (cat) =>
      cat.id === 'all' ||
      faqs.some((faq) => faq.category === cat.id),
  );

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-2 py-5 min-h-0">
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <CardTitle>Frequently asked questions</CardTitle>
          <Badge variant="secondary" appearance="light" size="sm">
            {faqs.length} articles
          </Badge>
        </div>
        {searchQuery ? (
          <p className="text-sm text-muted-foreground mb-0">
            {faqs.length} result{faqs.length === 1 ? '' : 's'} for your search
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mb-0">
            Answers to common questions about this ERP
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {categoriesWithFaqs.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              className={cn(
                'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                activeCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {faqs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center mb-0">
            No FAQs match your filters. Try another keyword or category.
          </p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={`faq-${i}`} value={`faq-${i}`}>
                <AccordionTrigger className="text-sm font-medium hover:no-underline text-start">
                  <span className="flex flex-col items-start gap-1.5 pe-2">
                    <span>{faq.q}</span>
                    {faq.category && activeCategory === 'all' && (
                      <Badge variant="outline" size="xs" className="font-normal">
                        {categoryLabel(faq.category)}
                      </Badge>
                    )}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
