"use client";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import BirthdayModal from "./BirthdayModal";

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* Hamburger Button (only visible when menu closed) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 bg-white text-black rounded-md"
        >
          <Menu />
        </button>
      )}

      {/* Slide-out menu */}
      {open && (
        <div className="fixed top-0 left-0 h-full w-64 bg-white text-black z-40 shadow-lg p-4">
          {/* Close Button inside menu */}
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-md hover:bg-gray-200"
          >
            <X />
          </button>

          <h2 className="text-xl font-bold mb-4 mt-12">Menu</h2>

          <button
            onClick={() => {
              setShowModal(true);
              setOpen(false);
            }}
            className="block w-full text-left p-2 rounded hover:bg-gray-200"
          >
            Enter Birthday
          </button>
        </div>
      )}

      {/* Birthday modal */}
      {showModal && <BirthdayModal onClose={() => setShowModal(false)} />}
    </>
  );
}
