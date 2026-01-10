import React from 'react';

export const CRTOverlay: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a2f1b] font-pixel selection:bg-balatro-gold selection:text-black">
      
      {/* Realistic Felt Texture */}
      <div className="absolute inset-0 z-0 opacity-100 pointer-events-none" 
           style={{
             backgroundImage: `
               radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.1) 0%, rgba(0, 0, 0, 0.4) 100%),
               url("https://www.transparenttextures.com/patterns/felt.png")
             `,
             backgroundBlendMode: 'overlay',
           }}>
      </div>
      
      {/* Vignette for focus */}
      <div className="absolute inset-0 z-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]"></div>

      {/* Main Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};