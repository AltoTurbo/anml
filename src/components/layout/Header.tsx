"use client";

import Link from 'next/link';
import { Dumbbell, UserCircle, LogIn, LogOut, LayoutDashboard, CalendarDays, ListChecks, Users, HomeIcon, Menu, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useState } from 'react';

export default function Header() {
  // Ahora userProfile contiene la info como name, email, role
  // currentUser es el objeto de Firebase Auth (puede ser null si no está logueado)
  // isAuthenticated nos dice si currentUser no es null
  const { userProfile, isAuthenticated, logoutUser, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Inicio', icon: HomeIcon, public: true, showAlways: true },
    { href: '/schedule', label: 'Horario', icon: CalendarDays, public: true, showAlways: true },
    { href: '/trainers', label: 'Entrenadores', icon: Users, public: true, showAlways: true },
    { href: '/bookings', label: 'Mis Reservas', icon: ListChecks, public: false, roles: ['client', 'admin'] },
    { href: '/trainer-dashboard', label: 'Panel', icon: LayoutDashboard, public: false, roles: ['trainer', 'admin'] },
  ];

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  // Si está cargando y no es una ruta pública que no dependa de auth, mostrar placeholder
  if (loading && !['/login', '/register', '/', '/schedule', '/trainers'].includes(pathname)) {
    return (
      <header className="bg-card text-card-foreground shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
            <Dumbbell className="h-7 w-7" />
            <span className="text-xl font-bold">Animal GYM</span>
          </Link>
          <div className="h-8 w-20 bg-muted rounded animate-pulse"></div>
        </div>
      </header>
    );
  }

  const renderNavLinks = (isMobile = false) => navLinks.map(link => {
    if (!link.public && !isAuthenticated) return null; // No mostrar si no es público y no está autenticado
    if (link.roles && (!userProfile || !link.roles.includes(userProfile.role))) return null; // No mostrar si el rol no coincide
    
    const Icon = link.icon;
    const linkContent = (
      <>
        <Icon className="h-4 w-4" />
        {link.label}
      </>
    );

    if (isMobile) {
      return (
        <SheetClose asChild key={link.href}>
          <Link
            href={link.href}
            className={`flex items-center gap-3 p-3 rounded-md ${pathname === link.href ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"}`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {linkContent}
          </Link>
        </SheetClose>
      );
    }

    return (
      <Button key={link.href} variant={pathname === link.href ? "secondary" : "ghost"} asChild size="sm">
        <Link href={link.href} className="flex items-center gap-2">
          {linkContent}
        </Link>
      </Button>
    );
  });


  return (
    <header className="bg-card text-card-foreground shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
          <Dumbbell className="h-7 w-7" />
          <span className="text-xl font-bold">Animal GYM</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-1">
          {renderNavLinks()}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated && userProfile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={`https://placehold.co/100x100.png?text=${getInitials(userProfile.name)}`} alt={userProfile.name} data-ai-hint="avatar perfil" />
                    <AvatarFallback>{getInitials(userProfile.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userProfile.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userProfile.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logoutUser}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            !loading && !['/login', '/register'].includes(pathname) && ( // No mostrar botones de login/registro en esas páginas
              <div className="hidden md:flex items-center gap-2">
                <Button variant="outline" onClick={() => router.push('/login')} size="sm">
                  <LogIn className="mr-2 h-4 w-4" /> Iniciar Sesión
                </Button>
                <Button onClick={() => router.push('/register')} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Registrarse
                </Button>
              </div>
            )
          )}
          
          {/* Botón de Menú Hamburguesa para Móvil */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-4">
                <div className="flex flex-col gap-2 mt-6">
                  {renderNavLinks(true)}
                  <DropdownMenuSeparator className="my-2"/>
                  {!isAuthenticated && !loading && (
                    <>
                      <SheetClose asChild>
                        <Button variant="outline" onClick={() => { router.push('/login'); setIsMobileMenuOpen(false); }} className="w-full justify-start gap-3 p-3">
                          <LogIn className="h-4 w-4" /> Iniciar Sesión
                        </Button>
                      </SheetClose>
                       <SheetClose asChild>
                        <Button onClick={() => { router.push('/register'); setIsMobileMenuOpen(false); }} className="w-full justify-start gap-3 p-3 bg-accent text-accent-foreground hover:bg-accent/90">
                          <UserPlus className="h-4 w-4" /> Registrarse
                        </Button>
                      </SheetClose>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
