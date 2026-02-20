export function HospitalBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Deep gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #0f2d4f 0%, #1a4a7a 40%, #0d7377 100%)',
        }}
      />

      {/* Subtle grid pattern */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Large glowing orbs */}
      <div
        className="absolute rounded-full opacity-20"
        style={{
          width: '600px',
          height: '600px',
          top: '-200px',
          left: '-100px',
          background: 'radial-gradient(circle, #2563ab, transparent 70%)',
        }}
      />
      <div
        className="absolute rounded-full opacity-15"
        style={{
          width: '500px',
          height: '500px',
          bottom: '-150px',
          right: '-100px',
          background: 'radial-gradient(circle, #0d7377, transparent 70%)',
        }}
      />

      {/* Decorative medical crosses */}
      <svg
        className="absolute opacity-[0.06]"
        style={{ top: '8%', right: '10%', width: '120px', height: '120px' }}
        viewBox="0 0 120 120"
        fill="white"
      >
        <rect x="45" y="0" width="30" height="120" rx="4" />
        <rect x="0" y="45" width="120" height="30" rx="4" />
      </svg>

      <svg
        className="absolute opacity-[0.04]"
        style={{ bottom: '15%', left: '6%', width: '80px', height: '80px' }}
        viewBox="0 0 120 120"
        fill="white"
      >
        <rect x="45" y="0" width="30" height="120" rx="4" />
        <rect x="0" y="45" width="120" height="30" rx="4" />
      </svg>

      <svg
        className="absolute opacity-[0.05]"
        style={{ top: '55%', right: '5%', width: '60px', height: '60px' }}
        viewBox="0 0 120 120"
        fill="white"
      >
        <rect x="45" y="0" width="30" height="120" rx="4" />
        <rect x="0" y="45" width="120" height="30" rx="4" />
      </svg>

      {/* Hospital building silhouette */}
      <svg
        className="absolute bottom-0 left-0 right-0 opacity-[0.07]"
        viewBox="0 0 1440 280"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
        fill="white"
      >
        {/* Main hospital building */}
        <rect x="400" y="80" width="240" height="200" />
        <rect x="460" y="40" width="120" height="50" />
        {/* Cross on top */}
        <rect x="510" y="10" width="20" height="50" />
        <rect x="495" y="22" width="50" height="20" />
        {/* Windows */}
        <rect x="420" y="110" width="30" height="35" fill="#0f2d4f" opacity="0.6" />
        <rect x="470" y="110" width="30" height="35" fill="#0f2d4f" opacity="0.6" />
        <rect x="520" y="110" width="30" height="35" fill="#0f2d4f" opacity="0.6" />
        <rect x="570" y="110" width="30" height="35" fill="#0f2d4f" opacity="0.6" />
        <rect x="420" y="165" width="30" height="35" fill="#0f2d4f" opacity="0.6" />
        <rect x="570" y="165" width="30" height="35" fill="#0f2d4f" opacity="0.6" />
        {/* Door */}
        <rect x="485" y="230" width="70" height="50" fill="#0f2d4f" opacity="0.6" />
        {/* Side wings */}
        <rect x="160" y="150" width="240" height="130" />
        <rect x="1040" y="150" width="240" height="130" />
        {/* Small buildings */}
        <rect x="0" y="190" width="160" height="90" />
        <rect x="1280" y="200" width="160" height="80" />
        {/* Ambulance */}
        <rect x="680" y="240" width="100" height="40" rx="5" />
        <rect x="700" y="220" width="60" height="30" rx="3" />
        <circle cx="700" cy="285" r="12" fill="#0f2d4f" opacity="0.8" />
        <circle cx="760" cy="285" r="12" fill="#0f2d4f" opacity="0.8" />
        {/* Cross on ambulance */}
        <rect x="720" y="228" width="8" height="20" fill="#0f2d4f" opacity="0.6" />
        <rect x="714" y="234" width="20" height="8" fill="#0f2d4f" opacity="0.6" />
      </svg>

      {/* Floating particles / dots */}
      {[
        { x: '15%', y: '20%', size: 4 },
        { x: '75%', y: '30%', size: 3 },
        { x: '85%', y: '70%', size: 5 },
        { x: '25%', y: '75%', size: 3 },
        { x: '50%', y: '15%', size: 4 },
        { x: '60%', y: '85%', size: 3 },
        { x: '40%', y: '60%', size: 2 },
        { x: '90%', y: '45%', size: 4 },
      ].map((dot, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white opacity-20"
          style={{
            left: dot.x,
            top: dot.y,
            width: dot.size,
            height: dot.size,
          }}
        />
      ))}
    </div>
  );
}
