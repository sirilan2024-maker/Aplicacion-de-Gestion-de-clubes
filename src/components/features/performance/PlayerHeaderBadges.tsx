'use client';

import React, { useEffect, useState } from 'react';
import { Goal, Shield, Sparkles, Award } from 'lucide-react';
import { getPlayerAchievementsAction } from '@/app/actions/tactical-actions';
import { PlayerAchievementBadge } from '@/lib/performance/tactical-analytics-service';

interface PlayerHeaderBadgesProps {
  playerId: string;
}

export function PlayerHeaderBadges({ playerId }: PlayerHeaderBadgesProps) {
  const [badges, setBadges] = useState<PlayerAchievementBadge[]>([]);

  useEffect(() => {
    if (!playerId) return;

    let isMounted = true;
    const fetchBadges = async () => {
      const res = await getPlayerAchievementsAction(playerId);
      if (isMounted && res.success && res.data) {
        // Filter out generic debut badges for header
        setBadges(res.data.filter(b => b.id !== 'debut'));
      }
    };

    fetchBadges();
    return () => {
      isMounted = false;
    };
  }, [playerId]);

  if (badges.length === 0) {
    return null;
  }

  const getPillIcon = (icon: string) => {
    switch (icon) {
      case 'goal':
        return <Goal className="w-3 h-3 text-amber-600 shrink-0" />;
      case 'hattrick':
        return <Sparkles className="w-3 h-3 text-purple-600 shrink-0" />;
      case 'shield':
        return <Shield className="w-3 h-3 text-emerald-600 shrink-0" />;
      default:
        return <Award className="w-3 h-3 text-blue-600 shrink-0" />;
    }
  };

  const getPillColors = (color: string) => {
    switch (color) {
      case 'amber':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'purple':
        return 'bg-purple-50 text-purple-900 border-purple-200';
      case 'emerald':
        return 'bg-emerald-50 text-emerald-900 border-emerald-200';
      case 'blue':
      default:
        return 'bg-blue-50 text-blue-900 border-blue-200';
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {badges.slice(0, 3).map(b => (
        <span
          key={b.id}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase shadow-2xs ${getPillColors(b.badgeColor)}`}
          title={b.description}
        >
          {getPillIcon(b.icon)}
          <span>{b.title}</span>
        </span>
      ))}
    </div>
  );
}
