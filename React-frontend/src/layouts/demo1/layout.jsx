import { useEffect, useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSettings } from '@/providers/settings-provider';
import { useAuthStore } from '@/store/authStore';
import { Footer } from './components/footer';
import { Header } from './components/header';
import { Sidebar } from './components/sidebar';

export function Demo1Layout() {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const enterAccountOwnerShell = useAuthStore((s) => s.enterAccountOwnerShell);
  const { settings, setOption } = useSettings();
  const collapsed = settings.layouts.demo1.sidebarCollapse;
  const sidebarWidth = collapsed ? '80px' : '280px';

  useEffect(() => {
    setOption('layout', 'demo1');
  }, [setOption]);

  useLayoutEffect(() => {
    // Clear workspace company context before child routes render or fetch data.
    enterAccountOwnerShell();
  }, [pathname, enterAccountOwnerShell]);

  useEffect(() => {
    const bodyClass = document.body.classList;

    // Add a class to the body element
    bodyClass.add('demo1');
    bodyClass.add('sidebar-fixed');
    bodyClass.add('header-fixed');

    const timer = setTimeout(() => {
      bodyClass.add('layout-initialized');
    }, 1000); // 1000 milliseconds

    // Remove the class when the component is unmounted
    return () => {
      bodyClass.remove('demo1');
      bodyClass.remove('sidebar-fixed');
      bodyClass.remove('sidebar-collapse');
      bodyClass.remove('header-fixed');
      bodyClass.remove('layout-initialized');
      clearTimeout(timer);
    };
  }, []); // Runs only once on mount

  return (
    <>
      {!isMobile && <Sidebar />}

      <div
        className="wrapper flex grow flex-col transition-[padding-inline-start] duration-300 ease-in-out"
        style={!isMobile ? { paddingInlineStart: sidebarWidth } : undefined}
      >
        <Header sidebarWidth={sidebarWidth} isMobile={isMobile} />

        <main className="grow pt-5" role="content">
          <Outlet />
        </main>

        <Footer />
      </div>
    </>
  );
}
