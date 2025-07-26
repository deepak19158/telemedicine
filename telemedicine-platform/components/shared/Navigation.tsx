"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  User,
  Settings,
  LogOut,
  Home,
  Calendar,
  Users,
  BarChart3,
  CreditCard,
  Heart,
} from "lucide-react";
import { Button } from "../ui";

export function Navigation() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  // Navigation items based on user role
  const getNavigationItems = () => {
    if (!session?.user) return [];

    const role = session.user.role;
    const baseItems = [
      {
        name: "Dashboard",
        href: `/${role}`,
        icon: Home,
      },
    ];

    switch (role) {
      case "patient":
        return [
          ...baseItems,
          {
            name: "Appointments",
            href: "/patient/appointments",
            icon: Calendar,
          },
          { name: "My Doctor", href: "/patient/doctor", icon: User },
          {
            name: "Medical Records",
            href: "/patient/records",
            icon: BarChart3,
          },
          { name: "Payments", href: "/patient/payments", icon: CreditCard },
        ];
      case "doctor":
        return [
          ...baseItems,
          {
            name: "Appointments",
            href: "/doctor/appointments",
            icon: Calendar,
          },
          { name: "Patients", href: "/doctor/patients", icon: Users },
          { name: "Schedule", href: "/doctor/schedule", icon: Calendar },
          { name: "Analytics", href: "/doctor/analytics", icon: BarChart3 },
        ];
      case "agent":
        return [
          ...baseItems,
          { name: "Referrals", href: "/agent/referrals", icon: Users },
          { name: "Commissions", href: "/agent/commissions", icon: CreditCard },
          { name: "Analytics", href: "/agent/analytics", icon: BarChart3 },
          { name: "Referral Codes", href: "/agent/codes", icon: Settings },
        ];
      case "admin":
        return [
          ...baseItems,
          { name: "Users", href: "/admin/users", icon: Users },
          { name: "Doctors", href: "/admin/doctors", icon: User },
          { name: "Agents", href: "/admin/agents", icon: Users },
          { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
          { name: "Settings", href: "/admin/settings", icon: Settings },
        ];
      default:
        return baseItems;
    }
  };

  const navigationItems = getNavigationItems();

  if (!session?.user) {
    return (
      <nav className="nav-medical">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-18">
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-medical-900">
                    MediCare Pro
                  </h1>
                  <p className="text-xs text-medical-500">
                    Professional Healthcare Platform
                  </p>
                </div>
              </Link>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <Link href="/login" className="nav-link px-4 py-2 rounded-lg">
                Sign In
              </Link>
              <Link href="/register" className="btn-primary">
                Get Started
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={toggleMenu}
                className="text-gray-700 hover:text-primary-600 focus:outline-none focus:text-primary-600"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
              <Link
                href="/login"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600"
                onClick={toggleMenu}
              >
                Login
              </Link>
              <Link
                href="/register"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600"
                onClick={toggleMenu}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>
    );
  }

  return (
    <nav className="nav-medical shadow-medical">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-18">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center mr-8">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-medical-900">
                  MediCare Pro
                </h1>
                <p className="text-xs text-medical-500">
                  Professional Healthcare Platform
                </p>
              </div>
            </Link>

            {/* Desktop navigation */}
            <div className="hidden md:flex md:space-x-6">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? "nav-link-active bg-primary-50 text-primary-600"
                        : "nav-link hover:bg-medical-50"
                    }`}
                  >
                    <Icon size={16} className="mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User menu */}
          <div className="hidden md:ml-4 md:flex-shrink-0 md:flex md:items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-medical-900">
                  {session.user.name}
                </div>
                <div className="text-xs text-medical-500 capitalize">
                  {session.user.role}
                </div>
              </div>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                  session.user.role === "doctor"
                    ? "bg-primary-600"
                    : session.user.role === "patient"
                      ? "bg-accent-600"
                      : session.user.role === "agent"
                        ? "bg-success-600"
                        : "bg-medical-600"
                }`}
              >
                {session.user.name?.charAt(0).toUpperCase()}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="inline-flex items-center btn-outline"
            >
              <LogOut size={16} className="mr-1" />
              Sign Out
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="text-gray-700 hover:text-primary-600 focus:outline-none focus:text-primary-600"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-3 py-2 text-base font-medium ${
                    isActive
                      ? "text-primary-600 bg-primary-50 border-l-4 border-primary-500"
                      : "text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                  }`}
                  onClick={toggleMenu}
                >
                  <span className="inline-flex items-center">
                    <Icon size={16} className="mr-2" />
                    {item.name}
                  </span>
                </Link>
              );
            })}

            <div className="border-t pt-4">
              <div className="px-3 py-2">
                <div className="text-sm text-gray-700">{session.user.name}</div>
                <div className="text-xs text-gray-500 capitalize">
                  {session.user.role}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-red-600 hover:bg-red-50"
              >
                <span className="inline-flex items-center">
                  <LogOut size={16} className="mr-2" />
                  Sign Out
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navigation;
