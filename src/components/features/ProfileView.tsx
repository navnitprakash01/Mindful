import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { AvatarUploader } from '../profile/AvatarUploader';
import { User, Flame, Clock, Calendar, Sparkles, Award, Shield, CheckCircle2 } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { userProfile, updateUserProfile, setIsPricingModalOpen, showToast } = useApp();
  const [name, setName] = useState(userProfile.name);
  const [email, setEmail] = useState(userProfile.email);
  const [dailyGoal, setDailyGoal] = useState(userProfile.dailyGoalMinutes);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      name,
      email,
      dailyGoalMinutes: Number(dailyGoal),
    });
    showToast("Profile details updated ✨");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-12 pt-24 pb-36 space-y-8">
      {/* Header */}
      <div>
        <Badge variant="lavender" className="mb-2">
          Sanctuary Profile
        </Badge>
        <h1 className="font-display-lg text-4xl sm:text-5xl text-primary dark:text-white">
          Personal Mindful Identity
        </h1>
      </div>

      {/* Main Profile Info Card */}
      <Card className="p-8 flex flex-col sm:flex-row items-center gap-6">
        <img
          src={userProfile.avatarUrl}
          alt={userProfile.name}
          className="w-24 h-24 rounded-full object-cover border-4 border-white/60 shadow-xl"
        />
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="font-display-lg text-3xl text-primary dark:text-white">
              {userProfile.name}
            </h2>
            <Badge variant={userProfile.plan === 'Mindful Pro' ? 'pro' : 'slate'}>
              {userProfile.plan}
            </Badge>
          </div>
          <p className="text-xs text-on-surface-variant font-mono mt-1">{userProfile.email}</p>
          <p className="text-xs text-on-surface-variant/70 mt-1">
            Member since {userProfile.joinedDate}
          </p>
        </div>

        {userProfile.plan !== 'Mindful Pro' && (
          <Button
            onClick={() => setIsPricingModalOpen(true)}
            variant="primary"
            size="sm"
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Upgrade Pro
          </Button>
        )}
      </Card>

      {/* Milestones Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-6 text-center">
          <Flame className="w-6 h-6 text-amber-500 mx-auto mb-2" />
          <span className="text-xs uppercase text-on-surface-variant font-semibold block">Current Streak</span>
          <span className="font-display-lg text-3xl text-primary dark:text-white font-mono">
            {userProfile.streakCount} Days
          </span>
        </Card>

        <Card className="p-6 text-center">
          <Clock className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
          <span className="text-xs uppercase text-on-surface-variant font-semibold block">Daily Practice Goal</span>
          <span className="font-display-lg text-3xl text-primary dark:text-white font-mono">
            {userProfile.dailyGoalMinutes} Mins
          </span>
        </Card>

        <Card className="p-6 text-center">
          <Award className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
          <span className="text-xs uppercase text-on-surface-variant font-semibold block">Sanctuary Level</span>
          <span className="font-display-lg text-3xl text-primary dark:text-white font-mono">
            Level 4 Zen
          </span>
        </Card>
      </div>

      {/* Profile Edit Form */}
      <Card className="p-8">
        <h3 className="font-display-lg text-2xl text-primary dark:text-white mb-6">
          Edit Profile Settings
        </h3>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <AvatarUploader currentAvatarUrl={userProfile.avatarUrl} displayName={name || userProfile.name} />
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Daily Practice Goal (Minutes)"
            type="number"
            value={dailyGoal}
            onChange={(e) => setDailyGoal(Number(e.target.value))}
          />

          <Button type="submit" variant="primary" size="md" className="mt-2">
            Save Profile Changes
          </Button>
        </form>
      </Card>
    </div>
  );
};
