'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Award, Goal, Shield, Star, Sparkles, CheckCircle2, Flame, Loader2 } from 'lucide-react';
import { getPlayerAchievementsAction } from '@/app/actions/tactical-actions';
import { PlayerAchievementBadge } from '@/lib/performance/tactical-analytics-service';

interface PlayerAchievementsShowcaseProps {
  playerId: string;
}

export function PlayerAchievementsShowcase({ playerId }: PlayerAchievementsShowcaseProps) {
  const [badges, setBadges] = useState<PlayerAchievementBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) return;

    let isMounted = true;
    const loadBadges = async () => {
      setLoading(true);
      const res = await getPlayerAchievementsAction(playerId);
      if (!isMounted) return;

      if (res.success && res.data) {
        setBadges(res.data);
      }
      setLoading(false);
    };

    loadBadges();
    return () => {
      isMounted = false;
    };
  }, [playerId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-center gap-2.5 text-slate-400 text-xs font-bold shadow-2xs">
        <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
        <span>Consultando vitrina de logros deportivos...</span>
      </div>
    );
  }

  if (badges.length === 0) {
    return null;
  }

  const getBadgeIcon = (icon: string) => {
    switch (icon) {
      case 'goal':
        return <Goal className="w-5 h-5 text-amber-500" />;
      case 'hattrick':
        return <Sparkles className="w-5 h-5 text-purple-500" />;
      case 'shield':
        return <Shield className="w-5 h-5 text-emerald-500" />;
      case 'regular':
        return <CheckCircle2 className="w-5 h-5 text-blue-500" />;
      default:
        return <Award className="w-5 h-5 text-amber-500" />;
    }
  };

  const getBadgeColors = (color: string) => {
    switch (color) {
      case 'amber':
        return {
          bg: 'bg-amber-50/70',
          border: 'border-amber-200',
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          title: 'text-amber-950',
          iconBg: 'bg-white border-amber-200 shadow-2xs'
        };
      case 'purple':
        return {
          bg: 'bg-purple-50/70',
          border: 'border-purple-200',
          badge: 'bg-purple-100 text-purple-800 border-purple-300',
          title: 'text-purple-950',
          iconBg: 'bg-white border-purple-200 shadow-2xs'
        };
      case 'emerald':
        return {
          bg: 'bg-emerald-50/70',
          border: 'border-emerald-200',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          title: 'text-emerald-950',
          iconBg: 'bg-white border-emerald-200 shadow-2xs'
        };
      case 'blue':
      default:
        return {
          bg: 'bg-blue-50/70',
          border: 'border-blue-200',
          badge: 'bg-blue-100 text-blue-800 border-blue-300',
          title: 'text-blue-950',
          iconBg: 'bg-white border-blue-200 shadow-2xs'
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-sm sm:text-base">
              Vitrina de Logros e Insignias Deportivas
            </h3>
            <p className="text-[11px] font-medium text-slate-400">
              Hitos conseguidos en partidos oficiales de la temporada
            </p>
          </div>
        </div>

        <span className="text-[11px] font-black uppercase text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
          {badges.length} {badges.length === 1 ? 'Insignia' : 'Insignias'}
        </span>
      </div>

      {/* Grid de Medallas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {badges.map(b => {
          const colors = getBadgeColors(b.badgeColor);
          return (
            <div
              key={b.id}
              className={`p-3.5 rounded-xl border ${colors.bg} ${colors.border} flex items-start gap-3 transition-all hover:shadow-xs group`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${colors.iconBg}`}>
                {getBadgeIcon(b.icon)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <h4 className={`text-xs font-black truncate ${colors.title}`}>
                    {b.title}
                  </h4>
                  {b.unlockedAt && (
                    <span className="text-[9px] font-bold text-slate-400 shrink-0">
                      {b.unlockedAt}
                    </span>
                  )}
                </div>

                <span className={`inline-block text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded border mb-1.5 ${colors.badge}`}>
                  {b.subtitle}
                </span>

                <p className="text-[11px] text-slate-600 leading-snug">
                  {b.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
