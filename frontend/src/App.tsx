import { useState } from 'react';
import { api } from './api/client';
import { useAuth } from './auth/useAuth';
import { useGameEngine } from './hooks/useGameEngine';
import { LoginView } from './components/LoginView';
import { TopBar } from './components/TopBar';
import { Sidebar, type ViewKey } from './components/Sidebar';
import { HabitatView } from './components/HabitatView';
import { CollectionView } from './components/CollectionView';
import { MarketView } from './components/MarketView';
import { UpgradesView } from './components/UpgradesView';
import { AchievementsView } from './components/AchievementsView';
import { RankingView } from './components/RankingView';
import { BattleView } from './components/BattleView';
import { PvpView } from './components/PvpView';
import { FriendsView } from './components/FriendsView';
import { ProfileModal } from './components/ProfileModal';
import { AdminView } from './components/AdminView';
import { JournalView } from './components/JournalView';
import { ChatWidget } from './components/ChatWidget';
import { Toast } from './components/Toast';
import { applySpeciesNicknames, getAchievementProgress, getPopulationCount } from './utils/gameCalc';
import './App.css';

function App() {
  const { user, loading: authLoading, logout, setUser } = useAuth();
  const {
    gameState,
    species,
    upgrades,
    quests,
    achievements,
    levelLeaderboard,
    incomeLeaderboard,
    pvpLeaderboard,
    leaderboardLoading,
    reloadLeaderboards,
    loading,
    error,
    toast,
    showToast,
    runAction,
  } = useGameEngine(user?._id ?? null);
  const [view, setView] = useState<ViewKey>('habitat');
  const [selectedTerrariumId, setSelectedTerrariumId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileTarget, setProfileTarget] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="center-screen">
        <p>로그인 상태를 확인하고 있어요...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  if (error) {
    return (
      <div className="center-screen">
        <p>문제가 발생했어요: {error}</p>
        <p className="footnote">백엔드 서버(NestJS)와 MongoDB가 실행 중인지 확인해 주세요.</p>
      </div>
    );
  }

  if (loading || !gameState) {
    return (
      <div className="center-screen">
        <p>작은 숲을 준비하고 있어요...</p>
      </div>
    );
  }

  // 내가 지정한 종 별명을 이름에 반영한 목록. 나에게만 보이는 표시용이라 원본 species는 그대로 둔다.
  const displaySpecies = applySpeciesNicknames(species, gameState);
  const terrarium =
    gameState.terrariums.find((t) => t.terrariumId === selectedTerrariumId) ??
    gameState.terrariums[0];
  const totalPopulation = gameState.terrariums.reduce(
    (sum, t) => sum + getPopulationCount(t.population),
    0,
  );
  const claimableAchievements = achievements.filter((a) => {
    if (gameState.achievementsClaimed.includes(a.achievementId)) return false;
    const { progress, target } = getAchievementProgress(a, gameState, species);
    return target > 0 && progress >= target;
  }).length;

  return (
    <>
      <TopBar
        coins={gameState.coins}
        explorationTickets={gameState.explorationTickets}
        diamonds={gameState.diamonds}
        user={user}
        onLogout={logout}
        onOpenProfile={() => setProfileTarget(user._id)}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
      <div className="app-shell">
        <Sidebar
          view={view}
          onChange={setView}
          populationCount={totalPopulation}
          claimableAchievements={claimableAchievements}
          discoveredCount={gameState.discovered.length}
          speciesTotal={species.length}
          xp={gameState.xp}
          isAdmin={user.isAdmin ?? false}
          mobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main>
          {view === 'habitat' && (
            <HabitatView
              gameState={gameState}
              species={displaySpecies}
              quests={quests}
              terrarium={terrarium}
              onSelectTerrarium={setSelectedTerrariumId}
              onAddTerrarium={async () => {
                const result = await runAction(() => api.addTerrarium());
                if (result?.terrariumId) setSelectedTerrariumId(result.terrariumId);
              }}
              onMove={(speciesId, toTerrariumId) =>
                runAction(() => api.moveSpecies(speciesId, terrarium.terrariumId, toTerrariumId))
              }
              onCare={(action) => runAction(() => api.care(action, terrarium.terrariumId))}
              onObserve={(speciesId) => runAction(() => api.observe(speciesId))}
              onCollect={() => runAction(() => api.collect())}
              onExplore={(useTicket) => runAction(() => api.explore(terrarium.terrariumId, useTicket))}
              onClaim={(questId) => runAction(() => api.claim(questId))}
            />
          )}
          {view === 'collection' && (
            <CollectionView
              gameState={gameState}
              species={displaySpecies}
              onSetNickname={(speciesId, nickname) =>
                runAction(() => api.setSpeciesNickname(speciesId, nickname))
              }
            />
          )}
          {view === 'market' && (
            <MarketView
              gameState={gameState}
              terrarium={terrarium}
              species={displaySpecies}
              onSell={(speciesId, quantity) =>
                runAction(() => api.sell(speciesId, quantity, terrarium.terrariumId))
              }
              onExplore={(useTicket) => runAction(() => api.explore(terrarium.terrariumId, useTicket))}
              onBuyTicket={(quantity) => runAction(() => api.buyTicket(quantity))}
            />
          )}
          {view === 'upgrades' && (
            <UpgradesView
              gameState={gameState}
              terrarium={terrarium}
              upgrades={upgrades}
              onSelectTerrarium={setSelectedTerrariumId}
              onUpgrade={(upgradeId) => runAction(() => api.upgrade(upgradeId, terrarium.terrariumId))}
            />
          )}
          {view === 'achievements' && (
            <AchievementsView
              gameState={gameState}
              species={species}
              achievements={achievements}
              onClaim={(achievementId) => runAction(() => api.claimAchievement(achievementId))}
            />
          )}
          {view === 'ranking' && (
            <RankingView
              levelLeaderboard={levelLeaderboard}
              incomeLeaderboard={incomeLeaderboard}
              pvpLeaderboard={pvpLeaderboard}
              loading={leaderboardLoading}
              onRefresh={reloadLeaderboards}
              onOpenProfile={setProfileTarget}
            />
          )}
          {view === 'battle' && (
            <BattleView
              gameState={gameState}
              species={displaySpecies}
              onBattle={(speciesId, difficulty) => runAction(() => api.battle(speciesId, difficulty))}
              onTrain={(speciesId, intensity, extreme) =>
                runAction(() => api.train(speciesId, intensity, extreme))
              }
            />
          )}
          {view === 'pvp' && (
            <PvpView
              gameState={gameState}
              species={displaySpecies}
              onSetDefense={(speciesId) => runAction(() => api.setPvpDefense(speciesId))}
              onFindOpponent={async () => {
                try {
                  return await api.getPvpOpponent();
                } catch (e) {
                  showToast(e instanceof Error ? e.message : '상대를 찾지 못했어요.', true);
                  return null;
                }
              }}
              onPvpBattle={(speciesId, opponentUserId) =>
                runAction(() => api.pvpBattle(speciesId, opponentUserId))
              }
            />
          )}
          {view === 'friends' && (
            <FriendsView showToast={showToast} onOpenProfile={setProfileTarget} />
          )}
          {view === 'journal' && <JournalView gameState={gameState} />}
          {view === 'admin' && user.isAdmin && <AdminView />}
        </main>
      </div>
      <ChatWidget currentUserId={user._id} onOpenProfile={setProfileTarget} />
      {profileTarget && (
        <ProfileModal
          targetUserId={profileTarget}
          currentUser={user}
          gameState={gameState}
          species={species}
          achievementsTotal={achievements.length}
          diamonds={gameState.diamonds}
          onClose={() => setProfileTarget(null)}
          onSetNickname={(nickname) =>
            runAction(() => api.setNickname(nickname)).then((result) => {
              if (result?.user) setUser(result.user);
            })
          }
          onSetProfileMessage={(message) =>
            api
              .setProfileMessage(message)
              .then((updated) => setUser(updated))
              .catch((e) => showToast(e instanceof Error ? e.message : '메시지 변경에 실패했어요.', true))
          }
          showToast={showToast}
        />
      )}
      <Toast toast={toast} />
    </>
  );
}

export default App;
