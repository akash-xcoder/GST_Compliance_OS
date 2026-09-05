import React from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavbarProps {
  onNavigateDashboard?: () => void;
  onNavigateLogin?: () => void;
  onNavigateSignup?: () => void;
  isLoggedIn?: boolean;
}

export function Navbar({ onNavigateDashboard, onNavigateLogin, onNavigateSignup, isLoggedIn = false }: NavbarProps) {
  return (
    <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white shadow-sm">
            <div className="w-3.5 h-3.5 border-2 border-white rotate-45"></div>
          </div>
          <div className="flex items-center">
            <span className="text-xl font-bold tracking-tight text-slate-800">GST Compliance OS</span>
            <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded uppercase tracking-wider">
              CA Enterprise
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-600">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span>Supabase Ready</span>
          </div>
          {isLoggedIn ? (
            <Button
              size="sm"
              onClick={onNavigateDashboard}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-semibold"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigateLogin}
                className="text-slate-600 hover:text-slate-900"
              >
                Sign In
              </Button>
              <Button
                size="sm"
                onClick={onNavigateSignup || onNavigateDashboard}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-semibold"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
