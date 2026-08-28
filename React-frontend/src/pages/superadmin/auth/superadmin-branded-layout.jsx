import { Link, Navigate, Outlet } from "react-router-dom";
import { toAbsoluteUrl } from "@/lib/helpers";
import { authCookies } from "@/auth/auth-cookies";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent } from "@/components/ui/card";

export function SuperAdminBrandedLayout() {
  const { user, token } = useAuthStore();
  const effectiveToken = token || authCookies.getToken();

  if (effectiveToken && (user?.role ?? "") === "super_admin") {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  return (
    <>
      <style>
        {`
          .superadmin-branded-bg {
            background-image: url('${toAbsoluteUrl("/media/images/2600x1600/1.png")}');
          }
          .dark .superadmin-branded-bg {
            background-image: url('${toAbsoluteUrl("/media/images/2600x1600/1-dark.png")}');
          }
        `}
      </style>
      <div className="grid lg:grid-cols-2 min-h-screen w-full">
        <div className="flex justify-center items-center p-8 lg:p-10 order-2 lg:order-1">
          <Card className="w-full max-w-[400px]">
            <CardContent className="p-6">
              <Outlet />
            </CardContent>
          </Card>
        </div>

        <div className="lg:rounded-xl lg:border lg:border-border lg:m-5 order-1 lg:order-2 bg-top xxl:bg-center xl:bg-cover bg-no-repeat superadmin-branded-bg">
          <div className="flex flex-col p-8 lg:p-16 gap-4">
            <Link to="/superadmin/login">
              <img
                src={toAbsoluteUrl("/media/app/finvoroo§§§§§§.svg")}
                className="h-[28px] max-w-none"
                alt=""
              />
            </Link>

            <div className="flex flex-col gap-3">
              <h3 className="text-2xl font-semibold text-mono">
                Super Admin Portal
              </h3>
              <div className="text-base font-medium text-secondary-foreground">
                Platform administration for account owners, users, and
                support-mode workspace access.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
