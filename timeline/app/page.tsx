"use client"
import HamburgerMenu from '@/app/components/HamburgerMenu';
import ZoomableTimeline from '@/app/components/Timeline';
import { SignedIn, SignedOut, SignInButton, SignUpButton, useAuth, UserButton } from '@clerk/nextjs';

export default function Home() {
  return (
    <div className="relative w-full h-screen">
      {/* Timeline component - put it first so it's behind everything */}
      <ZoomableTimeline />

      {/* Auth buttons - positioned absolutely on top */}
      <div className="absolute top-4 right-4 z-50">
        <SignedIn>
          <UserButton />
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <button className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center hover:bg-gray-400 transition-colors shadow-lg">
              <svg
                className="w-5 h-5 text-gray-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </SignInButton>
        </SignedOut>
      </div>
    </div>
  );
}