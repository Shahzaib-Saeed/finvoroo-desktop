import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, InputWrapper } from '@/components/ui/input';

export function HelpSearchCard({ search, onSearchChange, onClear, hasFilters }) {
  return (
    <Card>
      <CardHeader className="py-5 min-h-0">
        <CardTitle>Search help</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <InputWrapper>
              <Search className="size-4" />
              <Input
                id="helpSearchInput"
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search FAQs and guides (e.g. invoice, payroll, bank)…"
                autoComplete="off"
              />
            </InputWrapper>
          </div>
          {hasFilters && (
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              <X className="size-4" />
              Clear filters
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
