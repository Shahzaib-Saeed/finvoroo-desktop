import { Link, useLocation, useParams } from "react-router-dom";
import { Container } from "@/components/common/container";
import { toAbsoluteUrl } from "@/lib/helpers";
import { cn } from "@/lib/utils";

export function FinvorooFooter({ className }) {
  const { pathname } = useLocation();
  const { id: companyId } = useParams();
  const currentYear = new Date().getFullYear();

  const inWorkspace = pathname.startsWith("/workspace/") && Boolean(companyId);
  const helpTo = inWorkspace ? `/workspace/${companyId}/help` : "/help";

  return (
    <footer
      className={cn(
        "footer border-t border-border/60 bg-muted/20 mt-auto",
        className,
      )}
    >
      <Container>
        <div className="flex flex-col gap-5 py-6 md:flex-row md:items-center md:justify-between md:py-5">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={toAbsoluteUrl("/media/app/finvoroo.svg")}
              alt="Finvoroo"
              className="size-10 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">
                Finvoroo
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Smart Cloud Accounting
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-muted-foreground">
            {!inWorkspace ? (
              <>
                <Link
                  to="/dashboard"
                  className="hover:text-primary transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  to="/companies"
                  className="hover:text-primary transition-colors"
                >
                  Companies
                </Link>
              </>
            ) : null}
            <Link to={helpTo} className="hover:text-primary transition-colors">
              Help &amp; Support
            </Link>
          </nav>

          <p className="text-xs text-muted-foreground md:text-end shrink-0">
            &copy; {currentYear} Finvoroo. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
