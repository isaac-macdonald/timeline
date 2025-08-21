// components/BirthdayModal.tsx
"use client";
import { useBirthday } from "@/app/context/Context";
import { useState } from "react";

export default function BirthdayModal({ onClose }: { onClose: () => void }) {
  const { setBirthday } = useBirthday();
  const [input, setInput] = useState("");

  const handleSave = () => {
    if (input) {
      setBirthday(new Date(input));
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="bg-white text-black p-6 rounded-xl w-96 shadow-lg">
        <h2 className="text-lg font-bold mb-4">Enter your birthday</h2>
        <input
          type="date"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full p-2 border rounded mb-4"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-300">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
