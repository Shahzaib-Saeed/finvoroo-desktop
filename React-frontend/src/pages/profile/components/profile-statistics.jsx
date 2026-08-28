import { Card, CardContent } from '@/components/ui/card';

export function ProfileStatistics({ items }) {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap lg:flex-nowrap lg:px-10 py-1.5 gap-2">
          {items.map((item, index) => (
            <div key={item.label} className="contents">
              <div className="grid grid-cols-1 place-content-center flex-1 gap-1 text-center min-w-[120px] py-2">
                <span className="text-mono text-2xl leading-none font-semibold tabular-nums">
                  {item.number}
                </span>
                <span className="text-secondary-foreground text-sm">{item.label}</span>
              </div>
              {index < items.length - 1 ? (
                <span className="hidden lg:block border-e border-e-input my-1" />
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
