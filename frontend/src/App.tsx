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
import { JournalView } from './components/JournalView';
import { Toast } from './components/Toast';
import { getPopulationCount } from './utils/gameCalc';
import './App.css';

function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const { gameState, species, upgrades, quests, loading, error, toast, runAction } =
    useGameEngine(user?._id ?? null);
  const [view, setView] = useState<ViewKey>('habitat');

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

  const level = Math.floor(gameState.xp / 100) + 1;

  return (
    <>
      <TopBar coins={gameState.coins} user={user} onLogout={logout} />
      <div className="app-shell">
        <Sidebar
          view={view}
          onChange={setView}
          populationCount={getPopulationCount(gameState.population)}
          discoveredCount={gameState.discovered.length}
          speciesTotal={species.length}
          level={level}
          xp={gameState.xp}
        />
        <main>
          {view === 'habitat' && (
            <HabitatView
              gameState={gameState}
              species={species}
              quests={quests}
              onCare={(action) => runAction(() => api.care(action))}
              onObserve={(speciesId) => runAction(() => api.observe(speciesId))}
              onCollect={() => runAction(() => api.collect())}
              onExplore={() => runAction(() => api.explore())}
              onClaim={(questId) => runAction(() => api.claim(questId))}
            />
          )}
          {view === 'collection' && <CollectionView gameState={gameState} species={species} />}
          {view === 'market' && (
            <MarketView
              gameState={gameState}
              species={species}
              onSell={(speciesId, quantity) => runAction(() => api.sell(speciesId, quantity))}
              onExplore={() => runAction(() => api.explore())}
            />
          )}
          {view === 'upgrades' && (
            <UpgradesView
              gameState={gameState}
              upgrades={upgrades}
              onUpgrade={(upgradeId) => runAction(() => api.upgrade(upgradeId))}
            />
          )}
          {view === 'journal' && <JournalView gameState={gameState} />}
        </main>
      </div>
      <Toast toast={toast} />
    </>
  );
}

export default App;
