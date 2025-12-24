import React from 'react';

export default function LoadingScreen({ message = "Loading..." }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#0a0e0e] via-[#0f1414] to-[#0a0e0e] font-['Inter','system-ui','-apple-system','sans-serif'] text-white overflow-hidden">
      {/* Extremely dynamic animated background */}
      <div className="absolute inset-0">
        {/* Large floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/15 to-purple-500/15 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/15 to-blue-500/15 rounded-full blur-3xl animate-float-reverse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-white/8 to-transparent rounded-full blur-2xl animate-morph"></div>

        {/* Smaller floating elements */}
        <div className="absolute top-1/3 right-1/3 w-32 h-32 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-full blur-xl animate-float-fast animation-delay-1000"></div>
        <div className="absolute bottom-1/3 left-1/3 w-40 h-40 bg-gradient-to-r from-cyan-500/12 to-blue-500/12 rounded-full blur-2xl animate-float-reverse animation-delay-3000"></div>
      </div>

      {/* Advanced particle system */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Main particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={`particle-${i}`}
            className={`absolute rounded-full animate-particle-float`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 6 + 2}px`,
              height: `${Math.random() * 6 + 2}px`,
              background: `linear-gradient(45deg, rgba(${Math.random() * 100 + 155}, ${Math.random() * 100 + 155}, 255, ${Math.random() * 0.5 + 0.3}), rgba(${Math.random() * 100 + 155}, 255, ${Math.random() * 100 + 155}, ${Math.random() * 0.5 + 0.3}))`,
              animationDelay: `${Math.random() * 4000}ms`,
              animationDuration: `${Math.random() * 3000 + 4000}ms`
            }}
          ></div>
        ))}

        {/* Geometric floating shapes */}
        {[...Array(8)].map((_, i) => (
          <div
            key={`shape-${i}`}
            className={`absolute animate-shape-morph`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5000}ms`,
              animationDuration: `${Math.random() * 2000 + 3000}ms`
            }}
          >
            <div
              className="w-4 h-4 bg-gradient-to-br from-white/20 to-transparent"
              style={{
                clipPath: `polygon(${Math.random() * 100}% ${Math.random() * 100}%, ${Math.random() * 100}% ${Math.random() * 100}%, ${Math.random() * 100}% ${Math.random() * 100}%)`
              }}
            ></div>
          </div>
        ))}

        {/* Energy waves */}
        {[...Array(6)].map((_, i) => (
          <div
            key={`wave-${i}`}
            className="absolute border border-white/10 rounded-full animate-wave-expand"
            style={{
              width: `${Math.random() * 200 + 100}px`,
              height: `${Math.random() * 200 + 100}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6000}ms`,
              animationDuration: `${Math.random() * 2000 + 4000}ms`
            }}
          ></div>
        ))}
      </div>

      {/* Main Loading Card with extreme dynamism */}
      <div className="relative z-10 bg-black/30 backdrop-blur-3xl rounded-3xl p-16 shadow-2xl border border-white/20 max-w-2xl w-full mx-4 animate-card-entrance">
        {/* Ultra-layered glass effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-white/8 rounded-3xl animate-glass-shimmer"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-blue-500/8 via-transparent to-purple-500/8 rounded-3xl animate-glass-shimmer animation-delay-1000"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/6 via-transparent to-pink-500/6 rounded-3xl animate-glass-shimmer animation-delay-2000"></div>

        {/* Dynamic animated borders */}
        <div className="absolute inset-0 rounded-3xl border border-white/30 animate-border-glow"></div>
        <div className="absolute inset-1 rounded-2xl border border-white/15 animate-border-glow animation-delay-500"></div>
        <div className="absolute inset-2 rounded-xl border border-white/10 animate-border-glow animation-delay-1000"></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center space-y-10">
          {/* Ultimate crazy loading spinner */}
          <div className="relative w-40 h-40">
            {/* Primary rotation system */}
            <div className="absolute inset-0 border-6 border-white/40 border-t-white rounded-full animate-spin-slow"></div>
            <div className="absolute inset-3 border-4 border-transparent border-t-blue-400/80 rounded-full animate-spin-medium animation-reverse"></div>
            <div className="absolute inset-6 border-3 border-white/50 border-b-cyan-400/70 rounded-full animate-spin-fast"></div>

            {/* Secondary rotation system */}
            <div className="absolute inset-9 border-2 border-purple-400/60 border-l-transparent rounded-full animate-spin-reverse"></div>
            <div className="absolute inset-12 border border-pink-400/50 border-r-transparent rounded-full animate-spin-fast animation-reverse"></div>

            {/* Morphing geometric core */}
            <div className="absolute inset-16 flex items-center justify-center">
              <div className="relative w-8 h-8">
                {/* Rotating squares */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-cyan-400/30 animate-morph-square"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/30 to-pink-400/30 animate-morph-square animation-delay-1000 animation-reverse"></div>

                {/* Pulsing circles */}
                <div className="absolute inset-1 bg-gradient-to-br from-white/40 to-blue-400/40 rounded-full animate-pulse-core"></div>
                <div className="absolute inset-2 bg-gradient-to-br from-white/50 to-cyan-400/50 rounded-full animate-pulse-core animation-delay-500"></div>
              </div>
            </div>

            {/* Complex orbital system */}
            <div className="absolute inset-0 animate-orbit-slow">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-400 rounded-full animate-orbit-dot"></div>
              <div className="absolute top-1/2 right-0 transform translate-x-1/2 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-orbit-dot animation-delay-500"></div>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-purple-400 rounded-full animate-orbit-dot animation-delay-1000"></div>
              <div className="absolute top-1/2 left-0 transform -translate-x-1/2 w-2.5 h-2.5 bg-pink-400 rounded-full animate-orbit-dot animation-delay-1500"></div>
              <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-white/80 rounded-full animate-orbit-dot animation-delay-2000"></div>
              <div className="absolute bottom-1/4 left-1/4 w-2 h-2 bg-cyan-300 rounded-full animate-orbit-dot animation-delay-2500"></div>
            </div>

            {/* Energy field effect */}
            <div className="absolute inset-4 border-2 border-white/20 rounded-full animate-energy-pulse"></div>
            <div className="absolute inset-8 border border-cyan-400/30 rounded-full animate-energy-pulse animation-delay-1000"></div>

            {/* Central vortex core */}
            <div className="absolute inset-14 bg-gradient-conic from-white/30 via-blue-400/30 to-purple-400/30 rounded-full animate-vortex"></div>
            <div className="absolute inset-16 bg-gradient-conic from-white/40 via-cyan-400/40 to-pink-400/40 rounded-full animate-vortex animation-reverse"></div>
          </div>

          {/* Ultra-dynamic message display */}
          <div className="text-center space-y-6">
            <h3 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent animate-text-shimmer drop-shadow-2xl">
              {message}
            </h3>

            {/* Advanced multi-stage indicators */}
            <div className="flex justify-center items-center space-x-4">
              {/* Liquid wave bars */}
              <div className="flex space-x-1">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-gradient-to-t from-blue-400 via-cyan-400 to-white rounded-full animate-wave-liquid"
                    style={{
                      height: `${25 + Math.sin(i * 0.8) * 15}px`,
                      animationDelay: `${i * 120}ms`,
                    }}
                  ></div>
                ))}
              </div>

              {/* Triple rotating system */}
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 border-2 border-white/50 border-t-transparent rounded-full animate-spin-fast"></div>
                <div className="absolute inset-1 border-1.5 border-cyan-400/60 border-b-transparent rounded-full animate-spin-medium animation-reverse"></div>
                <div className="absolute inset-2 border border-purple-400/40 border-l-transparent rounded-full animate-spin-slow"></div>
              </div>

              {/* Morphing dots */}
              <div className="flex space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-morph-dot"
                    style={{ animationDelay: `${i * 250}ms` }}
                  ></div>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic progress indicators */}
          <div className="w-full space-y-3">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-400/60 via-cyan-400/60 to-purple-400/60 animate-progress-fill rounded-full"></div>
            </div>
            <div className="flex justify-center space-x-1">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-1 bg-white/40 rounded-full animate-progress-dots"
                  style={{ animationDelay: `${i * 150}ms` }}
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* Ultra-floating accent elements */}
        <div className="absolute -top-6 -right-6 w-12 h-12 bg-gradient-to-br from-blue-400/25 to-cyan-400/25 rounded-full animate-float-accent animation-delay-500"></div>
        <div className="absolute -bottom-6 -left-6 w-10 h-10 bg-gradient-to-br from-purple-400/25 to-pink-400/25 rounded-full animate-float-accent animation-delay-1500"></div>
        <div className="absolute top-1/4 -left-8 w-6 h-6 bg-gradient-to-br from-cyan-400/25 to-blue-400/25 rounded-full animate-float-accent animation-delay-2500"></div>
        <div className="absolute bottom-1/4 -right-8 w-8 h-8 bg-gradient-to-br from-pink-400/25 to-purple-400/25 rounded-full animate-float-accent animation-delay-3500"></div>

        {/* Energy streams */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent animate-energy-stream"></div>
          <div className="absolute top-1/2 right-0 w-full h-px bg-gradient-to-l from-transparent via-cyan-400/20 to-transparent animate-energy-stream animation-delay-2000"></div>
        </div>
      </div>

      {/* Global dynamic effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent animate-global-shimmer pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/2 animate-global-fade pointer-events-none"></div>
    </div>
  );
}
