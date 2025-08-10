import React, { useState, useEffect } from 'react';
//import AchievementPopup from '../components/AchievementPopup';

export default function AchievementManager() {
  const [active, setActive] = useState(null);

  useEffect(() => {
    function handler(e) {
      setActive(e.detail); // e.detail is the achievement object
    }
    window.addEventListener('achievementUnlocked', handler);
    return () => window.removeEventListener('achievementUnlocked', handler);
  }, []);


}
