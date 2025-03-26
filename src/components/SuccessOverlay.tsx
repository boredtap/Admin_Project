// src/components/SuccessOverlay.tsx
import React from 'react';
import Image from 'next/image';

interface SuccessOverlayProps {
  onClose: () => void;
}

const SuccessOverlay: React.FC<SuccessOverlayProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
      <div className="rounded-lg bg-gray-800 p-10 text-center text-white shadow-lg">
        <Image
          src="/success.png"
          alt="Success"
          width={100}
          height={100}
          className="mb-5 inline-block"
        />
        <h2 className="mb-2.5 text-3xl font-bold">Successful</h2>
        <p className="mb-5 text-base">You have successfully logged in.</p>
        <button
          onClick={onClose}
          className="rounded border border-gray-300 bg-gray-700 px-5 py-2.5 text-white hover:bg-gray-600"
        >
          Proceed
        </button>
      </div>
    </div>
  );
};

export default SuccessOverlay;