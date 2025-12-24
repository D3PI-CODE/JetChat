import React, { useState, useEffect } from 'react';
import { IoClose } from "react-icons/io5";

export default function NotificationBanner({ notification, onDismiss }) {
  const [isVisible, setIsVisible] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  const handleTouchStart = (e) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - startY;
    setCurrentY(Math.max(-100, Math.min(0, diffY)));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (currentY < -50) {
      handleDismiss();
    } else {
      setCurrentY(0);
    }
  };

  const handleMouseDown = (e) => {
    setStartY(e.clientY);
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const currentY = e.clientY;
    const diffY = currentY - startY;
    setCurrentY(Math.max(-100, Math.min(0, diffY)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (currentY < -50) {
      handleDismiss();
    } else {
      setCurrentY(0);
    }
  };

  if (!notification) return null;

  return (
    <div
      className={`fixed top-4 left-4 right-4 z-50 transition-all duration-300 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
      }`}
      style={{
        transform: `translateY(${currentY}px)`,
        touchAction: 'none'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setIsDragging(false)}
    >
      {/* Apple-style notification banner */}
      <div className="bg-black/20 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10 relative overflow-hidden max-w-md mx-auto">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5 rounded-2xl"></div>

        {/* Content */}
        <div className="relative z-10 p-4 flex items-start gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-semibold text-sm">
                {(notification.senderName || notification.sender || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Message content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-white font-medium text-sm truncate drop-shadow-sm">
                {notification.senderName || notification.sender || 'New Message'}
              </h4>
              <button
                onClick={handleDismiss}
                className="text-white/60 hover:text-white hover:bg-white/10 rounded-full p-1 transition-all duration-200 hover:scale-110"
              >
                <IoClose size={16} />
              </button>
            </div>
            <p className="text-white/80 text-sm line-clamp-2 drop-shadow-sm">
              {notification.message || notification.content || 'New message received'}
            </p>
            <div className="text-white/50 text-xs mt-1 drop-shadow-sm">
              {notification.chatName && `${notification.chatName} • `}
              now
            </div>
          </div>
        </div>

        {/* Swipe indicator */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-white/30 rounded-full"></div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-full bg-gradient-to-r from-blue-400 to-purple-400 animate-progress-shrink rounded-r-full"></div>
        </div>
      </div>
    </div>
  );
}
