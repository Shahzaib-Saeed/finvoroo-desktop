import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  ChevronRight,
  LayoutGrid,
  LogOut,
  MapPin,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { activeCompaniesOnly, useAuthStore } from "@/store/authStore";
import { authCookies } from "@/auth/auth-cookies";
import { toAbsoluteUrl } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { FirstCompanySetup } from "@/pages/auth/FirstCompanySetup";
import { getWorkspaceHomePath } from "@/industries";

function getDisplayName(user) {
  return (
    user?.fullname ||
    (user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.name || user?.username || user?.email || "User")
  );
}

function CompanyCard({ company, onSelect }) {
  const location = [company.city, company.country].filter(Boolean).join(", ");

  return (
    <button
      type="button"
      onClick={() => onSelect(company)}
      className={cn(
        "group w-full text-left rounded-xl border border-border/70 bg-card p-4",
        "hover:border-primary/40 hover:bg-primary/[0.03] hover:shadow-md",
        "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
          <Building2 className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate">
            {company.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {company.currency ? (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 font-medium"
              >
                {company.currency}
              </Badge>
            ) : null}
            {company.type ? (
              <span className="text-[11px] text-muted-foreground capitalize">
                {company.type}
              </span>
            ) : null}
            {company.role ? (
              <span className="text-[11px] text-muted-foreground capitalize">
                · {company.role.replace(/_/g, " ")}
              </span>
            ) : null}
          </div>
          {location ? (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground truncate">
              <MapPin className="size-3 shrink-0" />
              {location}
            </p>
          ) : null}
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1" />
      </div>
    </button>
  );
}

export function CompanySelectorPage() {
  const navigate = useNavigate();
  const {
    companies: allCompanies,
    setActiveCompany,
    clearActiveCompany,
    user,
    logout,
  } = useAuthStore();
  const companies = activeCompaniesOnly(allCompanies);
  const [search, setSearch] = useState("");

  const displayName = getDisplayName(user);
  const isOwner = (user?.role ?? "") === "company_owner";
  const showFirstCompanySetup = companies.length === 0 && isOwner;

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => {
      const haystack = [c.name, c.currency, c.city, c.country, c.type, c.role]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [companies, search]);

  function handleSelectCompany(company) {
    setActiveCompany(company);
    navigate(getWorkspaceHomePath(company), { replace: true });
  }

  function handleAccountDashboard() {
    clearActiveCompany();
    authCookies.clearCompanyId();
    navigate("/dashboard", { replace: true });
  }

  function handleLogout() {
    logout();
    navigate("/auth/signin", { replace: true });
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Brand panel */}
        <div className="relative hidden lg:flex flex-col justify-between overflow-hidden border-e border-border bg-muted/30 p-10 xl:p-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-20"
            style={{
              backgroundImage: `url('${toAbsoluteUrl("/media/images/2600x1600/1.png")}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="relative z-10">
            <img
              src={toAbsoluteUrl("/media/app/finvoroo.svg")}
              alt="Finvoroo"
              className="h-7"
            />
          </div>
          <div className="relative z-10 space-y-4 max-w-md">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              <Sparkles className="size-3.5 text-primary" />
              Secure workspace access
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground leading-tight">
              Choose how you want to continue
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Open a company workspace for day-to-day accounting and operations,
              or go to your account dashboard to manage companies, billing, and
              settings — without entering a workspace.
            </p>
          </div>
          <p className="relative z-10 text-xs text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">{user?.email}</span>
          </p>
        </div>

        {/* Selection panel */}
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-12 xl:px-16">
          <div className="w-full max-w-xl mx-auto space-y-8">
            <div className="space-y-2 text-center lg:text-left">
              <div className="lg:hidden flex justify-center mb-4">
                <img
                  src={toAbsoluteUrl("/media/app/finvoroo.svg")}
                  alt="Finvoroo"
                  className="h-7"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {showFirstCompanySetup
                  ? "Welcome to Finvoroo"
                  : "Where would you like to go?"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {showFirstCompanySetup ? (
                  <>
                    Hi {displayName}, let&apos;s create your first company to
                    get started.
                  </>
                ) : (
                  <>
                    Welcome back,{" "}
                    <span className="font-medium text-foreground">
                      {displayName}
                    </span>
                    . Pick an account overview or open a company workspace.
                  </>
                )}
              </p>
            </div>

            {showFirstCompanySetup ? (
              <FirstCompanySetup displayName={displayName} />
            ) : (
              <div className="space-y-6">
                {isOwner ? (
                  <Card
                    className={cn(
                      "overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent",
                      "shadow-sm hover:shadow-md transition-shadow",
                    )}
                  >
                    <CardContent className="p-0">
                      <button
                        type="button"
                        onClick={handleAccountDashboard}
                        className="flex w-full items-center gap-4 p-5 text-left hover:bg-primary/[0.04] transition-colors"
                      >
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                          <LayoutGrid className="size-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold text-foreground">
                            Account dashboard
                          </p>
                          <p className="mt-0.5 text-sm text-muted-foreground leading-snug">
                            Manage companies, view account overview, and
                            settings — no workspace required.
                          </p>
                        </div>
                        <ArrowRight className="size-5 shrink-0 text-primary" />
                      </button>
                    </CardContent>
                  </Card>
                ) : null}

                {companies.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-end justify-between gap-3 flex-wrap">
                      <div>
                        <h2 className="text-sm font-semibold text-foreground">
                          {isOwner ? "Company workspaces" : "Select a company"}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {companies.length} active{" "}
                          {companies.length === 1 ? "workspace" : "workspaces"}{" "}
                          available
                        </p>
                      </div>
                      {isOwner ? (
                        <Button asChild variant="outline" size="sm">
                          <Link to="/companies/create">
                            <Plus className="size-4" />
                            New company
                          </Link>
                        </Button>
                      ) : null}
                    </div>

                    {companies.length > 3 ? (
                      <div className="relative">
                        <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search companies…"
                          className="ps-9"
                        />
                      </div>
                    ) : null}

                    {filteredCompanies.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
                        <p className="text-sm text-muted-foreground">
                          No companies match your search.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {filteredCompanies.map((company) => (
                          <CompanyCard
                            key={company.id}
                            company={company}
                            onSelect={handleSelectCompany}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/20 p-8 text-center space-y-3">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted">
                      <Building2 className="size-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        No company workspaces
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        {isOwner
                          ? "Create a company from your account dashboard, or ask an administrator to add you to a workspace."
                          : "Contact your administrator to be added to a company workspace."}
                      </p>
                    </div>
                    {isOwner ? (
                      <Button asChild size="sm">
                        <Link to="/companies/create">Create company</Link>
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/60">
              <p className="text-xs text-muted-foreground hidden sm:block">
                Need a different account? Sign out and switch credentials.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2 text-muted-foreground hover:text-foreground ms-auto"
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
