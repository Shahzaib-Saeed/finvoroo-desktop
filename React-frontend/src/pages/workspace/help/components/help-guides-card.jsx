import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function sectionTitle(key, labels) {
  return labels?.[key] || key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function HelpGuidesCard({ guideSections, sectionLabels }) {
  const entries = Object.entries(guideSections || {});

  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-1.5 py-5 min-h-0">
        <CardTitle>Guides & how-tos</CardTitle>
        <p className="text-sm text-muted-foreground mb-0">
          Step-by-step reference for common workflows
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {entries.map(([key, articles]) => (
          <section key={key}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {sectionTitle(key, sectionLabels)}
            </h3>
            <Accordion type="single" collapsible className="w-full">
              {(articles || []).map((article, idx) => (
                <AccordionItem key={`${key}-${idx}`} value={`guide-${key}-${idx}`}>
                  <AccordionTrigger className="text-sm font-medium hover:no-underline">
                    {article.title}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {article.body}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
